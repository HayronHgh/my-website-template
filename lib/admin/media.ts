import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AdminApiError } from "@/lib/admin/http";
import {
  getSafePostMarkdownFilePath,
  getVersionedBlogAssetUrl,
} from "@/lib/blog/assets";
import { clearContentCache } from "@/lib/content/cache";

const TYPES = new Map([["image/avif", ".avif"], ["image/gif", ".gif"], ["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"], ["video/mp4", ".mp4"]]);

export async function getAdminArticleMediaUrl(slug: string, assetPath: string) {
  const publicUrl = await getVersionedBlogAssetUrl(slug, assetPath);

  return publicUrl.startsWith("/articles/assets/")
    ? publicUrl.replace(/^\/articles\/assets\//, "/api/admin/media/")
    : publicUrl;
}

export async function saveArticleMedia(slug: string, file: File) {
  const extension = TYPES.get(file.type); if (!extension) throw new AdminApiError(415, "unsupported_asset", "媒體僅支援圖片或 MP4。");
  const limit = file.type === "video/mp4" ? 100 * 1024 * 1024 : 12 * 1024 * 1024;
  if (file.size < 1 || file.size > limit) throw new AdminApiError(413, "asset_too_large", file.type === "video/mp4" ? "MP4 不可超過 100MB。" : "圖片不可超過 12MB。");
  const markdownPath = await getSafePostMarkdownFilePath(slug);
  if (!markdownPath) throw new AdminApiError(404, "article_not_found", "請先儲存文章，再上傳媒體。");
  const directory = path.join(path.dirname(markdownPath), "assets"); await fs.mkdir(directory, { recursive: true });
  const directoryStat = await fs.lstat(directory); if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) throw new AdminApiError(409, "unsafe_asset_directory", "文章資產目錄不安全。");
  const fileName = `media-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`; const filePath = path.join(directory, fileName);
  await fs.writeFile(filePath, new Uint8Array(await file.arrayBuffer()), { flag: "wx", mode: 0o644 }); clearContentCache();
  return { assetPath: `assets/${fileName}`, mimeType: file.type, size: file.size };
}
