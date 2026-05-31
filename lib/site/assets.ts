import { promises as fs } from "node:fs";
import path from "node:path";

export const SITE_CONTENT_DIRECTORY = path.join(process.cwd(), "content", "site");
export const SITE_ASSET_DIRECTORY = path.join(SITE_CONTENT_DIRECTORY, "assets");

const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const SITE_ASSET_EXTENSIONS = new Set([
  ".avif",
  ".gif",
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".webp",
]);

const hasUnsafeSegment = (segment: string) =>
  segment.length === 0 || segment === "." || segment === ".." || /[\\/]/.test(segment);

const isInsideDirectory = (parent: string, target: string) =>
  target === parent || target.startsWith(`${parent}${path.sep}`);

function isRelativeSiteAssetPath(assetPath: string) {
  const trimmedPath = assetPath.trim();

  return (
    trimmedPath.length > 0 &&
    !URL_SCHEME_PATTERN.test(trimmedPath) &&
    !trimmedPath.startsWith("/") &&
    !trimmedPath.startsWith("#")
  );
}

export function getSiteAssetUrl(assetPath: string) {
  const trimmedPath = assetPath.trim();

  if (!isRelativeSiteAssetPath(trimmedPath)) {
    return trimmedPath;
  }

  const assetSegments = trimmedPath
    .replace(/^\.\/+/, "")
    .split(/[\\/]+/)
    .filter(Boolean);

  if (assetSegments.length === 0 || assetSegments.some(hasUnsafeSegment)) {
    return trimmedPath;
  }

  return `/site/assets/${assetSegments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

export async function getSafeSiteAssetFilePath(assetSegments: string[]) {
  if (
    assetSegments.length === 0 ||
    assetSegments.some(hasUnsafeSegment) ||
    !SITE_ASSET_EXTENSIONS.has(path.extname(assetSegments.at(-1) ?? "").toLowerCase())
  ) {
    return null;
  }

  try {
    const assetRoot = await fs.realpath(SITE_ASSET_DIRECTORY);
    const assetFilePath = path.resolve(assetRoot, ...assetSegments);
    const realAssetFilePath = await fs.realpath(assetFilePath);

    return isInsideDirectory(assetRoot, realAssetFilePath) ? realAssetFilePath : null;
  } catch {
    return null;
  }
}
