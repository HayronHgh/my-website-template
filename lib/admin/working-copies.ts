import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { AdminApiError } from "@/lib/admin/http";
import { atomicWriteTextFile } from "@/lib/admin/articles/atomic-write";
import { articleStore } from "@/lib/admin/articles/store";
import { researchStore } from "@/lib/research/store";
import { problemStore } from "@/lib/leetcode/store";
import { problemSchema, validateEntryContent } from "@/lib/leetcode/schema";
import { researchMetadataSchema } from "@/lib/research/schema";
import { createArticleRequestSchema } from "@/lib/admin/schemas";
import type { AdminArticleInput, AdminIdentity } from "@/types/admin";
import { remark } from "remark";
import { parseChart } from "@/lib/content/chart-spec";

export const domainSchema = z.enum(["articles", "research", "leetcode"]);
export type WritingDomain = z.infer<typeof domainSchema>;
export const workingFields = z
  .object({
    title: z.string().max(160),
    description: z.string().max(500),
    date: z.string().max(10),
    content: z.string().max(500_000),
    tags: z.array(z.string().max(40)).max(20),
    published: z.boolean(),
    problem: z
      .object({
        ...problemSchema.shape,
        language: z.string().max(40).nullable(),
      })
      .strict()
      .optional(),
    research: z
      .object({ ...researchMetadataSchema.shape, area: z.string().max(120) })
      .strict()
      .optional(),
  })
  .strict();
export const workingUpdate = z
  .object({
    revision: z.string().uuid(),
    slug: z.string().max(240),
    fields: workingFields,
  })
  .strict();
export const workingOpen = z
  .object({ domain: domainSchema, slug: z.string().max(240).optional() })
  .strict();
export type WorkingCopy = {
  id: string;
  domain: WritingDomain;
  slug: string;
  owner: string;
  baseRevision: string | null;
  revision: string;
  updatedAt: string;
  fields: AdminArticleInput;
  publishedRevision?: string;
  publishedWorkingRevision?: string;
};
export type WorkingCopyListItem = Pick<
  WorkingCopy,
  "id" | "domain" | "slug" | "updatedAt"
> & { fields: Pick<AdminArticleInput, "title" | "published"> };
const stores = {
  articles: articleStore,
  research: researchStore,
  leetcode: problemStore,
};
const publishSchema = createArticleRequestSchema.extend({
  problem: problemSchema.optional(),
  research: researchMetadataSchema.optional(),
});
const uuid = z.string().uuid();
const processStartedAt = Date.now() - process.uptime() * 1000;

export function createWorkingCopyStore(
  root = path.join(process.cwd(), "content", ".editor-workspace"),
  repository = stores,
) {
  async function directory() {
    await fs.mkdir(root, { recursive: true, mode: 0o700 });
    const stat = await fs.lstat(root);
    if (stat.isSymbolicLink() || !stat.isDirectory())
      throw new AdminApiError(409, "unsafe_workspace", "工作稿目錄不安全。");
  }
  function file(id: string) {
    if (!uuid.safeParse(id).success)
      throw new AdminApiError(400, "invalid_id", "工作稿識別不正確。");
    return path.join(root, `${id}.json`);
  }
  function access(copy: WorkingCopy, user: AdminIdentity) {
    if (
      user.role !== "admin" &&
      (copy.owner !== user.username || copy.fields.published)
    )
      throw new AdminApiError(403, "forbidden", "沒有權限編輯這份工作稿。");
  }
  async function read(id: string, user: AdminIdentity) {
    const p = file(id);
    await directory();
    try {
      const stat = await fs.lstat(p);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("unsafe");
      const copy = JSON.parse(await fs.readFile(p, "utf8")) as WorkingCopy;
      access(copy, user);
      return copy;
    } catch (e) {
      if (e instanceof AdminApiError) throw e;
      throw new AdminApiError(404, "working_copy_missing", "工作稿不存在。");
    }
  }
  async function locked<T>(id: string, run: () => Promise<T>): Promise<T> {
    await directory();
    const lock = `${file(id)}.lock`;
    let handle;
    try {
      handle = await fs.open(lock, "wx", 0o600);
    } catch (error) {
      let stale = false;
      if ((error as NodeJS.ErrnoException).code === "EEXIST") {
        try {
          const owner = JSON.parse(await fs.readFile(lock, "utf8")) as {
            pid: number;
            startedAt: number;
          };
          if (owner.pid === process.pid)
            stale = Math.abs(owner.startedAt - processStartedAt) > 2000;
          else {
            try {
              process.kill(owner.pid, 0);
            } catch (e) {
              stale = (e as NodeJS.ErrnoException).code === "ESRCH";
            }
          }
        } catch {}
      }
      if (stale) {
        await fs.unlink(lock);
        handle = await fs.open(lock, "wx", 0o600);
      } else
        throw new AdminApiError(
          409,
          "workspace_busy",
          "工作稿正在寫入，請稍後重試。",
        );
    }
    await handle.writeFile(
      JSON.stringify({ pid: process.pid, startedAt: processStartedAt }),
    );
    try {
      return await run();
    } finally {
      await handle.close();
      await fs.unlink(lock);
    }
  }
  async function list(domain: WritingDomain, user: AdminIdentity) {
    await directory();
    const copies: WorkingCopy[] = [];
    for (const name of await fs.readdir(root)) {
      if (!name.endsWith(".json") || !uuid.safeParse(name.slice(0, -5)).success)
        continue;
      try {
        const copy = await read(name.slice(0, -5), user);
        if (copy.domain === domain) copies.push(copy);
      } catch (e) {
        if (!(e instanceof AdminApiError && e.status === 403)) throw e;
      }
    }
    return copies.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  async function open(
    domain: WritingDomain,
    slug: string | undefined,
    user: AdminIdentity,
  ) {
    if (slug) {
      const existing = (await list(domain, user)).find((c) => c.slug === slug);
      if (existing) return existing;
    }
    const article = slug ? await repository[domain].read(slug) : null;
    if (article?.published && user.role !== "admin")
      throw new AdminApiError(403, "forbidden", "Editor 不可修改已發布文章。");
    const copy: WorkingCopy = {
      id: randomUUID(),
      domain,
      slug: article?.slug ?? "",
      owner: user.username,
      baseRevision: article?.revision ?? null,
      revision: randomUUID(),
      updatedAt: new Date().toISOString(),
      fields: article
        ? {
            content: article.content,
            title: article.title,
            description: article.description,
            tags: article.tags,
            date: article.date,
            published: article.published,
            ...(article.problem ? { problem: article.problem } : {}),
            ...(article.research ? { research: article.research } : {}),
          }
        : {
            title: "",
            description: "",
            content: "",
            tags: [],
            date: new Date().toLocaleDateString("en-CA", {
              timeZone: "Asia/Taipei",
            }),
            published: false,
            ...(domain === "research"
              ? {
                  research: {
                    area: "Research",
                    rank: 10,
                    stage: "exploring" as const,
                  },
                }
              : {}),
            ...(domain === "leetcode"
              ? {
                  problem: {
                    id: 1,
                    difficulty: "Easy" as const,
                    status: "Todo" as const,
                    language: "TypeScript",
                  },
                }
              : {}),
          },
    };
    await directory();
    await atomicWriteTextFile(file(copy.id), JSON.stringify(copy));
    return copy;
  }
  async function update(
    id: string,
    input: z.infer<typeof workingUpdate>,
    user: AdminIdentity,
  ) {
    return locked(id, async () => {
      const copy = await read(id, user);
      if (copy.revision !== input.revision)
        throw new AdminApiError(
          409,
          "revision_conflict",
          "另一個視窗已更新工作稿；本機內容仍保留。",
        );
      if (copy.baseRevision && copy.slug !== input.slug)
        throw new AdminApiError(
          422,
          "slug_immutable",
          "既有文章網址不可在此修改。",
        );
      if (copy.fields.published !== input.fields.published)
        throw new AdminApiError(
          422,
          "lifecycle_forbidden",
          "工作稿不能變更公開狀態。",
        );
      const next = {
        ...copy,
        slug: input.slug,
        fields: input.fields,
        revision: randomUUID(),
        updatedAt: new Date().toISOString(),
      };
      await atomicWriteTextFile(file(id), JSON.stringify(next));
      return next;
    });
  }
  async function publish(id: string, revision: string, user: AdminIdentity) {
    return locked(id, async () => {
      const copy = await read(id, user);
      if (copy.revision !== revision)
        throw new AdminApiError(
          409,
          "revision_conflict",
          "工作稿已有更新，請先重新載入。",
        );
      if (user.role !== "admin")
        throw new AdminApiError(403, "forbidden", "只有管理員可以發布。");
      const result = publishSchema.safeParse({
        ...copy.fields,
        tags: copy.fields.tags.filter((tag) => tag.trim()),
        slug: copy.slug,
        published: true,
      });
      if (!result.success)
        throw new AdminApiError(
          422,
          "invalid_article",
          "請先完成標題、日期、摘要、網址與內容。",
          result.error.flatten(),
        );
      const { slug, ...fields } = result.data;
      if (copy.domain === "leetcode" && fields.problem) {
        try {
          validateEntryContent(fields.content, true, fields.problem);
        } catch (e) {
          throw new AdminApiError(
            422,
            "invalid_problem_sections",
            (e as Error).message,
          );
        }
      }
      for (const node of remark().parse(fields.content).children) {
        if (node.type === "code" && node.lang === "chart") {
          try {
            parseChart(node.value);
          } catch (e) {
            throw new AdminApiError(
              422,
              "invalid_chart",
              `圖表資料尚未完成：${(e as Error).message}`,
            );
          }
        }
      }
      if (!copy.baseRevision) {
        // Create a non-public article first. Assets are promoted before the only
        // public write, and an interrupted publish can resume from this revision.
        const draft = await repository[copy.domain].create(
          slug,
          { ...fields, published: false },
          user.role,
        );
        copy.baseRevision = draft.revision;
        await atomicWriteTextFile(file(id), JSON.stringify(copy));
      }
      const current = await repository[copy.domain].read(slug);
      if (current.revision !== copy.baseRevision)
        throw new AdminApiError(
          409,
          "revision_conflict",
          "正式文章已有更新，請先比較並合併。",
        );
      await promoteAssets(copy);
      const article = await repository[copy.domain].update(
        slug,
        { ...fields, revision: copy.baseRevision },
        user.role,
        "manual",
      );
      const next: WorkingCopy = {
        ...copy,
        fields: { ...copy.fields, published: true },
        baseRevision: article.revision,
        revision: randomUUID(),
        updatedAt: new Date().toISOString(),
        publishedRevision: article.revision,
        publishedWorkingRevision: copy.revision,
      };
      await atomicWriteTextFile(file(id), JSON.stringify(next));
      return { copy: next, article };
    });
  }
  const assetTypes = new Map([
    ["image/png", ".png"],
    ["image/jpeg", ".jpg"],
    ["image/webp", ".webp"],
    ["image/gif", ".gif"],
    ["image/avif", ".avif"],
    ["video/mp4", ".mp4"],
  ]);
  async function assetDirectory(id: string) {
    file(id);
    await directory();
    let current = root;
    for (const segment of ["assets", id]) {
      current = path.join(current, segment);
      await fs.mkdir(current, { recursive: true, mode: 0o700 });
      const stat = await fs.lstat(current);
      if (stat.isSymbolicLink() || !stat.isDirectory())
        throw new AdminApiError(409, "unsafe_asset", "資產目錄不安全。");
    }
    return current;
  }
  async function uploadMedia(id: string, asset: File, user: AdminIdentity) {
    await read(id, user);
    const extension = assetTypes.get(asset.type);
    if (!extension)
      throw new AdminApiError(415, "unsupported_asset", "僅支援圖片與 MP4。");
    if (
      asset.size < 1 ||
      asset.size > (asset.type === "video/mp4" ? 100 : 12) * 1024 * 1024
    )
      throw new AdminApiError(413, "asset_too_large", "媒體超過大小限制。");
    const name = `workspace-${id}-${randomUUID()}${extension}`;
    const dir = await assetDirectory(id);
    await fs.writeFile(
      path.join(dir, name),
      new Uint8Array(await asset.arrayBuffer()),
      { flag: "wx", mode: 0o600 },
    );
    return {
      assetPath: `assets/${name}`,
      url: `/api/admin/working-copies/${id}/assets/${name}`,
    };
  }
  async function readMedia(id: string, name: string, user: AdminIdentity) {
    await read(id, user);
    if (
      !new RegExp(
        `^workspace-${id}-[a-f0-9-]{36}\\.(png|jpg|webp|gif|avif|mp4)$`,
      ).test(name)
    )
      throw new AdminApiError(400, "invalid_asset", "資產名稱不正確。");
    const p = path.join(await assetDirectory(id), name);
    const stat = await fs.lstat(p).catch(() => null);
    if (!stat?.isFile() || stat.isSymbolicLink())
      throw new AdminApiError(404, "asset_missing", "資產不存在。");
    const ext = path.extname(name);
    return {
      bytes: await fs.readFile(p),
      type:
        [...assetTypes].find(([, e]) => e === ext)?.[0] ??
        "application/octet-stream",
    };
  }
  async function promoteAssets(copy: WorkingCopy) {
    const dir = path.join(root, "assets", copy.id);
    const names = await fs.readdir(dir).catch((e: NodeJS.ErrnoException) => {
      if (e.code === "ENOENT") return [];
      throw e;
    });
    if (!names.length) return;
    let destination = path.dirname(root);
    const section = copy.domain === "articles" ? "blog" : copy.domain;
    for (const segment of [section, ...copy.slug.split("/"), "assets"]) {
      destination = path.join(destination, segment);
      await fs.mkdir(destination, { recursive: true });
      const stat = await fs.lstat(destination);
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new AdminApiError(409, "unsafe_asset", "正式資產目錄不安全。");
    }
    for (const name of names) {
      const asset = await readMedia(copy.id, name, {
        role: "admin",
        username: copy.owner,
        displayName: copy.owner,
      });
      const target = path.join(destination, name);
      try {
        await fs.writeFile(target, asset.bytes, { flag: "wx", mode: 0o644 });
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
        const stat = await fs.lstat(target);
        if (
          !stat.isFile() ||
          stat.isSymbolicLink() ||
          !(await fs.readFile(target)).equals(asset.bytes)
        )
          throw new AdminApiError(409, "asset_conflict", "資產已有不同版本。");
      }
    }
  }
  async function discard(id: string, revision: string, user: AdminIdentity) {
    return locked(id, async () => {
      const copy = await read(id, user);
      if (copy.revision !== revision)
        throw new AdminApiError(409, "revision_conflict", "工作稿已有更新。");
      const archive = path.join(root, "discarded");
      await fs.mkdir(archive, { mode: 0o700, recursive: true });
      await fs.rename(file(id), path.join(archive, `${id}-${Date.now()}.json`));
    });
  }
  return { read, list, open, update, publish, discard, uploadMedia, readMedia };
}
export const workingCopies = createWorkingCopyStore();
