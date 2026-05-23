import matter from "gray-matter";
import {
  DEFAULT_BLOG_POST_FRONTMATTER,
  type BlogPostFrontmatter,
  type BlogPostMeta,
} from "@/types/blog";

const toNonEmptyString = (value: unknown, fallback: string) => {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallback;
};

const toDateString = (value: unknown, fallback: string) => {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return fallback;
    }

    return value.toISOString().slice(0, 10);
  }

  const normalizedValue = toNonEmptyString(value, fallback);
  const parsedDate = new Date(normalizedValue);

  return Number.isNaN(parsedDate.getTime()) ? fallback : normalizedValue;
};

const toStringArray = (value: unknown) => {
  const dedupe = (entries: string[]) => [...new Set(entries)];

  if (Array.isArray(value)) {
    return dedupe(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
  }

  if (typeof value === "string") {
    return dedupe(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
  }

  return [];
};

const toOptionalString = (value: unknown) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const toOptionalNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value.trim());
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
};

const toBoolean = (value: unknown, fallback: boolean) => {
  if (typeof value === "boolean") {
    return value;
  }

  return fallback;
};

const createFallbackTitle = (slug: string) =>
  slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export function parseBlogFrontmatter(
  source: string,
  slug: string,
  pathSegments: string[],
): {
  content: string;
  meta: BlogPostMeta;
} {
  const { data, content } = matter(source);

  const defaults: BlogPostFrontmatter = {
    ...DEFAULT_BLOG_POST_FRONTMATTER,
    title: createFallbackTitle(pathSegments.at(-1) ?? slug),
  };

  const meta: BlogPostMeta = {
    slug,
    pathSegments,
    title: toNonEmptyString(data.title, defaults.title),
    date: toDateString(data.date, defaults.date),
    summary: toNonEmptyString(data.summary, defaults.summary),
    tags: toStringArray(data.tags),
    published: toBoolean(data.published, defaults.published),
    coverImage: toOptionalString(data.coverImage),
    featuredRank: toOptionalNumber(data.featuredRank),
    relatedProjects: toStringArray(data.relatedProjects),
    series:
      pathSegments.length > 1
        ? {
            slug: pathSegments[0],
            title: toNonEmptyString(data.series, createFallbackTitle(pathSegments[0])),
          }
        : undefined,
  };

  return {
    content,
    meta,
  };
}
