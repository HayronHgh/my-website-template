import { promises as fs } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { z } from "zod";
import { AdminApiError } from "@/lib/admin/http";
import { atomicWriteTextFile } from "@/lib/admin/articles/atomic-write";
import { clearContentCache } from "@/lib/content/cache";
import { projectMetaSchema } from "@/lib/content/validation";
import { resumeSchema } from "@/lib/resume/schema";
import { isSafeMarkdownUrl } from "@/lib/content/url-policy";
const queues = new Map<string, Promise<unknown>>();
const revisionOf = (text: string) => createHash("sha256").update(text).digest("hex");

async function resolveDocument(key: string) {
  if (!/^(?:resume\/resume.json|projects\/[a-z0-9]+(?:-[a-z0-9]+)*\/(?:meta.json|main.md))$/.test(key))
    throw new AdminApiError(400, "invalid_document", "不支援這個內容項目。");
  let current = path.join(process.cwd(), "content");
  for (const part of ["", ...key.split("/")]) {
    current = path.join(current, part);
    const stat = await fs.lstat(current).catch(() => null);
    if (!stat || stat.isSymbolicLink()) throw new AdminApiError(404, "document_not_found", "找不到內容檔案。");
  }
  return current;
}
export async function readDocument(key: string) {
  const source = await fs.readFile(await resolveDocument(key), "utf8");
  const jsonSource = source.startsWith("\uFEFF") ? source.slice(1) : source;
  return { key, data: key.endsWith(".json") ? JSON.parse(jsonSource) : source, revision: revisionOf(source) };
}
export async function updateDocument(key: string, data: unknown, revision: string) {
  const previous = queues.get(key) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(async () => {
    const current = await readDocument(key);
    if (current.revision !== revision) throw new AdminApiError(409, "revision_conflict", "內容已在其他地方更新。請保留本機內容，再重新載入合併。");
    let source: string;
    if (key.endsWith("main.md")) {
      const parsed = z.string().min(1).max(500000).refine((value) => value.trim().length > 0).safeParse(data);
      if (!parsed.success) throw new AdminApiError(422, "invalid_document", "專案說明不可為空白。");
      source = parsed.data;
    } else {
      const parsed = (key.startsWith("resume/") ? resumeSchema : projectMetaSchema).safeParse(data);
      if (!parsed.success) throw new AdminApiError(422, "invalid_document", "內容欄位不完整或格式錯誤。", parsed.error.issues);
      const values = parsed.data as Record<string, unknown>;
      if (key.startsWith("resume/")) {
        for (const slug of values.projectSlugs as string[]) {
          const project = await readDocument(`projects/${slug}/meta.json`).catch(() => null);
          if (!project) throw new AdminApiError(422, "invalid_project_reference", `找不到履歷引用的專案：${slug}`);
        }
      }
      if (key.startsWith("projects/")) {
        if (values.slug !== key.split("/")[1]) throw new AdminApiError(422, "invalid_slug", "無法在此更改專案 slug。");
        for (const field of ["detailsUrl","repoUrl","demoUrl","caseStudyUrl"]) {
          if (values[field] && !isSafeMarkdownUrl(String(values[field]), "link")) throw new AdminApiError(422, "invalid_url", "連結格式不安全。");
        }
      }
      source = JSON.stringify(values, null, 2) + "\n";
    }
    await atomicWriteTextFile(await resolveDocument(key), source);
    clearContentCache();
    return readDocument(key);
  });
  queues.set(key, next);
  try { return await next; } finally { if (queues.get(key) === next) queues.delete(key); }
}
