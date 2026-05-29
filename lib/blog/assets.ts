import { promises as fs } from "node:fs";
import path from "node:path";
import { BLOG_CONTENT_DIRECTORY, BLOG_POST_FILE_NAME } from "@/lib/blog/constants";

const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const BLOG_ASSET_EXTENSIONS = new Set([
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

const hasAllowedBlogAssetExtension = (filePath: string) =>
  BLOG_ASSET_EXTENSIONS.has(path.extname(filePath).toLowerCase());

const getContentRoot = () => path.resolve(BLOG_CONTENT_DIRECTORY);

const isInsideDirectory = (parent: string, target: string) =>
  target === parent || target.startsWith(`${parent}${path.sep}`);

export function getSlugSegments(slug: string | string[]) {
  const segments = Array.isArray(slug) ? slug : slug.split("/");
  const normalizedSegments = segments.map((segment) => segment.trim()).filter(Boolean);

  if (normalizedSegments.length === 0 || normalizedSegments.some(hasUnsafeSegment)) {
    return null;
  }

  return normalizedSegments;
}

export function getSlugFromSegments(segments: string[]) {
  return segments.join("/");
}

export function isRelativeBlogAssetPath(assetPath: string) {
  const trimmedPath = assetPath.trim();

  return (
    trimmedPath.length > 0 &&
    !URL_SCHEME_PATTERN.test(trimmedPath) &&
    !trimmedPath.startsWith("/") &&
    !trimmedPath.startsWith("#")
  );
}

export function getBlogAssetUrl(slug: string, assetPath: string) {
  const trimmedPath = assetPath.trim();

  if (!isRelativeBlogAssetPath(trimmedPath)) {
    return trimmedPath;
  }

  const slugSegments = getSlugSegments(slug);
  const assetSegments = trimmedPath
    .replace(/^\.\/+/, "")
    .split(/[\\/]+/)
    .filter(Boolean);

  if (
    !slugSegments ||
    assetSegments.length === 0 ||
    assetSegments.some((segment) => segment === "." || segment === "..")
  ) {
    return trimmedPath;
  }

  return `/blog/assets/${[...slugSegments, ...assetSegments]
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function getPostDirectoryPath(slug: string | string[]) {
  const slugSegments = getSlugSegments(slug);

  if (!slugSegments) {
    return null;
  }

  const contentRoot = getContentRoot();
  const postDirectory = path.resolve(contentRoot, ...slugSegments);

  return isInsideDirectory(contentRoot, postDirectory) && postDirectory !== contentRoot
    ? postDirectory
    : null;
}

export function getPostMarkdownFilePath(slug: string | string[]) {
  const postDirectory = getPostDirectoryPath(slug);
  return postDirectory ? path.join(postDirectory, BLOG_POST_FILE_NAME) : null;
}

export async function getSafePostMarkdownFilePath(slug: string | string[]) {
  const postDirectory = getPostDirectoryPath(slug);
  const filePath = getPostMarkdownFilePath(slug);

  if (!postDirectory || !filePath) {
    return null;
  }

  try {
    const [contentRoot, realPostDirectory, realFilePath] = await Promise.all([
      fs.realpath(getContentRoot()),
      fs.realpath(postDirectory),
      fs.realpath(filePath),
    ]);
    const realPostMarkdownPath = path.join(realPostDirectory, BLOG_POST_FILE_NAME);

    return realPostDirectory !== contentRoot &&
      isInsideDirectory(contentRoot, realPostDirectory) &&
      realFilePath === realPostMarkdownPath
      ? realFilePath
      : null;
  } catch {
    return null;
  }
}

export function getPostAssetFilePath(
  slug: string | string[],
  assetSegments: string[],
) {
  if (
    assetSegments.length === 0 ||
    assetSegments.some(hasUnsafeSegment) ||
    !hasAllowedBlogAssetExtension(assetSegments.at(-1) ?? "")
  ) {
    return null;
  }

  const postDirectory = getPostDirectoryPath(slug);

  if (!postDirectory) {
    return null;
  }

  const resolvedPostDirectory = path.resolve(postDirectory);
  const assetFilePath = path.resolve(resolvedPostDirectory, ...assetSegments);
  const postMarkdownPath = path.join(resolvedPostDirectory, BLOG_POST_FILE_NAME);

  return isInsideDirectory(resolvedPostDirectory, assetFilePath) &&
    assetFilePath !== postMarkdownPath
    ? assetFilePath
    : null;
}

export async function getSafePostAssetFilePath(
  slug: string | string[],
  assetSegments: string[],
) {
  const postDirectory = getPostDirectoryPath(slug);
  const assetFilePath = getPostAssetFilePath(slug, assetSegments);

  if (!postDirectory || !assetFilePath) {
    return null;
  }

  try {
    const postMarkdownPath = await getSafePostMarkdownFilePath(slug);

    if (!postMarkdownPath) {
      return null;
    }

    const [realPostDirectory, realPostMarkdownPath, realAssetFilePath] =
      await Promise.all([
        fs.realpath(postDirectory),
        fs.realpath(postMarkdownPath),
        fs.realpath(assetFilePath),
      ]);

    return isInsideDirectory(realPostDirectory, realAssetFilePath) &&
      realAssetFilePath !== realPostMarkdownPath &&
      hasAllowedBlogAssetExtension(realAssetFilePath)
      ? realAssetFilePath
      : null;
  } catch {
    return null;
  }
}
