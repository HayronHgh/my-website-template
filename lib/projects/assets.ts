import path from "node:path";
import {
  PROJECT_CONTENT_DIRECTORY,
  PROJECT_DETAIL_FILE_NAME,
  PROJECT_META_FILE_NAME,
} from "@/lib/projects/constants";

const URL_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;

const hasUnsafeSegment = (segment: string) =>
  segment.length === 0 || segment === "." || segment === ".." || /[\\/]/.test(segment);

const getContentRoot = () => path.resolve(PROJECT_CONTENT_DIRECTORY);

const isInsideDirectory = (parent: string, target: string) =>
  target === parent || target.startsWith(`${parent}${path.sep}`);

export function getProjectSlugSegments(slug: string | string[]) {
  const segments = Array.isArray(slug) ? slug : slug.split("/");
  const normalizedSegments = segments.map((segment) => segment.trim()).filter(Boolean);

  if (normalizedSegments.length !== 1 || normalizedSegments.some(hasUnsafeSegment)) {
    return null;
  }

  return normalizedSegments;
}

export function isRelativeProjectAssetPath(assetPath: string) {
  const trimmedPath = assetPath.trim();

  return (
    trimmedPath.length > 0 &&
    !URL_SCHEME_PATTERN.test(trimmedPath) &&
    !trimmedPath.startsWith("/") &&
    !trimmedPath.startsWith("#")
  );
}

export function getProjectAssetUrl(slug: string, assetPath: string) {
  const trimmedPath = assetPath.trim();

  if (!isRelativeProjectAssetPath(trimmedPath)) {
    return trimmedPath;
  }

  const slugSegments = getProjectSlugSegments(slug);
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

  return `/projects/assets/${[...slugSegments, ...assetSegments]
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

export function getProjectDirectoryPath(slug: string | string[]) {
  const slugSegments = getProjectSlugSegments(slug);

  if (!slugSegments) {
    return null;
  }

  const contentRoot = getContentRoot();
  const projectDirectory = path.resolve(contentRoot, ...slugSegments);

  return isInsideDirectory(contentRoot, projectDirectory) && projectDirectory !== contentRoot
    ? projectDirectory
    : null;
}

export function getProjectMarkdownFilePath(slug: string | string[]) {
  const projectDirectory = getProjectDirectoryPath(slug);
  return projectDirectory ? path.join(projectDirectory, PROJECT_DETAIL_FILE_NAME) : null;
}

export function getProjectMetaFilePath(slug: string | string[]) {
  const projectDirectory = getProjectDirectoryPath(slug);
  return projectDirectory ? path.join(projectDirectory, PROJECT_META_FILE_NAME) : null;
}

export function getProjectAssetFilePath(
  slug: string | string[],
  assetSegments: string[],
) {
  if (assetSegments.length === 0 || assetSegments.some(hasUnsafeSegment)) {
    return null;
  }

  const projectDirectory = getProjectDirectoryPath(slug);

  if (!projectDirectory) {
    return null;
  }

  const resolvedProjectDirectory = path.resolve(projectDirectory);
  const assetFilePath = path.resolve(resolvedProjectDirectory, ...assetSegments);
  const projectMarkdownPath = path.join(resolvedProjectDirectory, PROJECT_DETAIL_FILE_NAME);
  const projectMetaPath = path.join(resolvedProjectDirectory, PROJECT_META_FILE_NAME);

  return isInsideDirectory(resolvedProjectDirectory, assetFilePath) &&
    assetFilePath !== projectMarkdownPath &&
    assetFilePath !== projectMetaPath
    ? assetFilePath
    : null;
}
