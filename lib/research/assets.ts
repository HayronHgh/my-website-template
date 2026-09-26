import { promises as fs } from "node:fs";
import path from "node:path";
import { parseSafeExistingBlogSlug } from "@/lib/blog/slug";
import { RESEARCH_CONTENT_DIRECTORY } from "@/lib/research/store";

const extensions = new Set([".avif", ".gif", ".jpg", ".jpeg", ".png", ".svg", ".webp", ".mp4"]);
const isInside = (parent: string, target: string) => target.startsWith(`${parent}${path.sep}`);
const safeSegment = (segment: string) => Boolean(segment) && segment !== "." && segment !== ".." && !/[\\/]/.test(segment);

export function getResearchDirectory(slug: string | readonly string[]) {
  const parsed = parseSafeExistingBlogSlug(slug);
  if (!parsed) return null;
  const root = path.resolve(RESEARCH_CONTENT_DIRECTORY);
  const target = path.resolve(root, ...parsed.pathSegments);
  return target !== root && isInside(root, target) ? target : null;
}

export function getResearchAssetUrl(slug: string, assetPath: string) {
  const parsed = parseSafeExistingBlogSlug(slug);
  const segments = assetPath.trim().replace(/^\.\/+/, "").split(/[\\/]+/).filter(Boolean);
  if (!parsed || !segments.length || segments.some((segment) => !safeSegment(segment)) || /^[a-z][a-z\d+.-]*:/i.test(assetPath) || assetPath.startsWith("/")) return assetPath;
  return `/research/assets/${[...parsed.pathSegments, ...segments].map(encodeURIComponent).join("/")}`;
}

export async function getSafeResearchMarkdownPath(slug: string | readonly string[]) {
  const directory = getResearchDirectory(slug);
  if (!directory) return null;
  try {
    const [directoryStats, markdownStats, realRoot, realDirectory, realMarkdown] = await Promise.all([
      fs.lstat(directory),
      fs.lstat(path.join(directory, "main.md")),
      fs.realpath(RESEARCH_CONTENT_DIRECTORY),
      fs.realpath(directory),
      fs.realpath(path.join(directory, "main.md")),
    ]);
    return directoryStats.isDirectory() && !directoryStats.isSymbolicLink() && markdownStats.isFile() && !markdownStats.isSymbolicLink() && isInside(realRoot, realDirectory) && realMarkdown === path.join(realDirectory, "main.md") ? realMarkdown : null;
  } catch { return null; }
}

export async function getSafeResearchAssetPath(slug: string | readonly string[], assetSegments: string[]) {
  if (!assetSegments.length || assetSegments.some((segment) => !safeSegment(segment)) || !extensions.has(path.extname(assetSegments.at(-1) ?? "").toLowerCase())) return null;
  const markdownPath = await getSafeResearchMarkdownPath(slug);
  if (!markdownPath) return null;
  const directory = path.dirname(markdownPath);
  const target = path.resolve(directory, ...assetSegments);
  if (!isInside(directory, target) || target === markdownPath) return null;
  try {
    const [stats, realDirectory, realTarget] = await Promise.all([fs.lstat(target), fs.realpath(directory), fs.realpath(target)]);
    return stats.isFile() && !stats.isSymbolicLink() && isInside(realDirectory, realTarget) ? realTarget : null;
  } catch { return null; }
}

export async function getVersionedResearchAssetUrl(slug: string, assetPath: string) {
  const url = getResearchAssetUrl(slug, assetPath);
  const segments = assetPath.trim().replace(/^\.\/+/, "").split(/[\\/]+/).filter(Boolean);
  const filePath = await getSafeResearchAssetPath(slug, segments);
  if (!filePath) return url;
  const stats = await fs.stat(filePath);
  return `${url}?v=${Math.trunc(stats.mtimeMs)}-${stats.size}`;
}
