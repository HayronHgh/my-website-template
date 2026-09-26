import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { AdminApiError } from "@/lib/admin/http";
import { clearContentCache } from "@/lib/content/cache";
import { getSafeResearchMarkdownPath, getVersionedResearchAssetUrl } from "@/lib/research/assets";

const types = new Map([["image/avif", ".avif"], ["image/gif", ".gif"], ["image/jpeg", ".jpg"], ["image/png", ".png"], ["image/webp", ".webp"], ["video/mp4", ".mp4"]]);

export async function getAdminResearchMediaUrl(slug: string, assetPath: string) {
  const publicUrl = await getVersionedResearchAssetUrl(slug, assetPath);
  return publicUrl.startsWith("/research/assets/") ? publicUrl.replace(/^\/research\/assets\//, "/api/admin/research-media/") : publicUrl;
}

export async function saveResearchMedia(slug: string, file: File) {
  const extension = types.get(file.type);
  if (!extension) throw new AdminApiError(415, "unsupported_asset", "媒體僅支援圖片或 MP4。");
  const limit = file.type === "video/mp4" ? 100 * 1024 * 1024 : 12 * 1024 * 1024;
  if (file.size < 1 || file.size > limit) throw new AdminApiError(413, "asset_too_large", file.type === "video/mp4" ? "MP4 不可超過 100MB。" : "圖片不可超過 12MB。");
  const markdownPath = await getSafeResearchMarkdownPath(slug);
  if (!markdownPath) throw new AdminApiError(404, "research_not_found", "請先儲存研究文章，再上傳媒體。");
  const directory = path.join(path.dirname(markdownPath), "assets");
  await fs.mkdir(directory, { recursive: true });
  const stats = await fs.lstat(directory);
  if (!stats.isDirectory() || stats.isSymbolicLink()) throw new AdminApiError(409, "unsafe_asset_directory", "研究資產目錄不安全。");
  const fileName = `media-${Date.now()}-${randomUUID().slice(0, 8)}${extension}`;
  await fs.writeFile(path.join(directory, fileName), new Uint8Array(await file.arrayBuffer()), { flag: "wx", mode: 0o644 });
  clearContentCache();
  return { assetPath: `assets/${fileName}`, mimeType: file.type, size: file.size };
}
