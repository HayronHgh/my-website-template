import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AdminApiError } from "@/lib/admin/http";
import { atomicWriteTextFile } from "@/lib/admin/articles/atomic-write";
import { clearContentCache } from "@/lib/content/cache";
import { projectMetaSchema } from "@/lib/content/validation";
import { PROJECT_CONTENT_DIRECTORY } from "@/lib/projects/constants";
import { getProjectDirectoryPath } from "@/lib/projects/assets";

const PROJECT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export async function createProject(slug: string, title: string) {
  if (!PROJECT_SLUG_PATTERN.test(slug)) {
    throw new AdminApiError(422, "invalid_slug", "slug 只能使用小寫英數字與連字號。");
  }

  const projectDirectory = getProjectDirectoryPath(slug);
  if (!projectDirectory) throw new AdminApiError(422, "invalid_slug", "專案 slug 不正確。");

  await fs.mkdir(PROJECT_CONTENT_DIRECTORY, { recursive: true });
  const projectRoot = await fs.realpath(PROJECT_CONTENT_DIRECTORY);
  if (path.dirname(projectDirectory) !== projectRoot) {
    throw new AdminApiError(422, "invalid_slug", "專案路徑不正確。");
  }

  try {
    await fs.mkdir(projectDirectory);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      throw new AdminApiError(409, "project_exists", "這個專案 slug 已存在。");
    }
    throw error;
  }

  const meta = projectMetaSchema.parse({
    accent: "cyan",
    category: "Project",
    cover: `generated:${slug}`,
    coverPosition: "center center",
    description: "請補充專案背景、設計與成果。",
    detailsUrl: `/projects/${slug}`,
    group: "experiments",
    published: false,
    slug,
    summary: "請補充專案摘要。",
    tech: [],
    title,
  });
  const markdown = `# ${title}\n\n## 專案背景\n\n請說明問題與目標。\n\n## 實作內容\n\n請記錄架構、功能與技術取捨。\n\n## 驗證與成果\n\n請補充測試、數據或使用結果。\n`;

  try {
    await atomicWriteTextFile(path.join(projectDirectory, "meta.json"), `${JSON.stringify(meta, null, 2)}\n`);
    await atomicWriteTextFile(path.join(projectDirectory, "main.md"), markdown);
  } catch (error) {
    await fs.rm(projectDirectory, { recursive: true, force: true });
    throw error;
  }

  clearContentCache();
  return { slug };
}

const ASSET_TYPES = new Map([
  ["image/avif", ".avif"], ["image/gif", ".gif"], ["image/jpeg", ".jpg"],
  ["image/png", ".png"], ["image/webp", ".webp"], ["video/mp4", ".mp4"],
]);
const IMAGE_LIMIT = 12 * 1024 * 1024;
const VIDEO_LIMIT = 100 * 1024 * 1024;

export async function saveProjectAsset(slug: string, file: File, purpose: "cover" | "media") {
  const extension = ASSET_TYPES.get(file.type);
  if (!extension || (purpose === "cover" && file.type === "video/mp4")) {
    throw new AdminApiError(415, "unsupported_asset", purpose === "cover" ? "封面僅支援 JPG、PNG、WebP、GIF 或 AVIF。" : "媒體僅支援圖片或 MP4。");
  }
  const limit = file.type === "video/mp4" ? VIDEO_LIMIT : IMAGE_LIMIT;
  if (file.size < 1 || file.size > limit) {
    throw new AdminApiError(413, "asset_too_large", file.type === "video/mp4" ? "MP4 不可超過 100MB。" : "圖片不可超過 12MB。");
  }

  const projectDirectory = getProjectDirectoryPath(slug);
  if (!projectDirectory) throw new AdminApiError(404, "project_not_found", "找不到專案。");
  const stat = await fs.lstat(projectDirectory).catch(() => null);
  if (!stat?.isDirectory() || stat.isSymbolicLink()) throw new AdminApiError(404, "project_not_found", "找不到專案。");

  const assetDirectory = path.join(projectDirectory, "assets");
  await fs.mkdir(assetDirectory, { recursive: true });
  const assetDirectoryStat = await fs.lstat(assetDirectory);
  if (!assetDirectoryStat.isDirectory() || assetDirectoryStat.isSymbolicLink()) throw new AdminApiError(409, "unsafe_asset_directory", "專案資產目錄不安全。");

  const fileName = `${purpose}-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
  const filePath = path.join(assetDirectory, fileName);
  await fs.writeFile(filePath, new Uint8Array(await file.arrayBuffer()), { flag: "wx", mode: 0o644 });
  clearContentCache();
  return { assetPath: `assets/${fileName}`, mimeType: file.type, size: file.size };
}
