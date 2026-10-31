import { promises as fs } from "node:fs";
import path from "node:path";
import { BLOG_POST_FILE_NAME } from "@/lib/blog/constants";
import { parseBlogFrontmatter } from "@/lib/blog/parse-frontmatter";
import { parseSafeExistingBlogSlug } from "@/lib/blog/slug";
import { parseFrontmatter } from "@/lib/content/frontmatter";
import type { ProblemMetadata } from "@/lib/leetcode/schema";
import type { ResearchMetadata } from "@/lib/research/schema";

export type ContentArticle = {
  content: string;
  date: string;
  description: string;
  pathSegments: string[];
  problem?: ProblemMetadata;
  published: boolean;
  research?: ResearchMetadata;
  slug: string;
  tags: string[];
  title: string;
  updatedAt: string;
};

export type ContentArticleListItem = Omit<ContentArticle, "content">;

type ArticleReaderOptions = {
  directory: string;
  readMetadata?: (data: Record<string, unknown>) => Partial<ContentArticle>;
};

/** Raised when a slug is unsafe or no article exists at that path. */
export class ContentNotFoundError extends Error {}

/** Raised when the content tree contains a symlink or other unsafe entry. */
export class UnsafeContentError extends Error {}

const isInsideDirectory = (parent: string, target: string) =>
  target === parent || target.startsWith(`${parent}${path.sep}`);

const isMissing = (error: unknown) => (error as NodeJS.ErrnoException).code === "ENOENT";

async function isRegularFile(filePath: string) {
  try {
    const stats = await fs.lstat(filePath);
    if (stats.isFile() && !stats.isSymbolicLink()) return true;
    throw new UnsafeContentError(`Unsafe article source: ${filePath}`);
  } catch (error) {
    if (isMissing(error)) return false;
    throw error;
  }
}

/**
 * Read-only access to `content/<domain>/<slug>/main.md` trees (one or two
 * levels deep). Content is edited directly on disk; this module never writes.
 */
export function createArticleReader(options: ArticleReaderOptions) {
  const directory = path.resolve(options.directory);

  async function realRoot() {
    try {
      const stats = await fs.lstat(directory);
      if (!stats.isDirectory() || stats.isSymbolicLink()) {
        throw new UnsafeContentError(`Unsafe content directory: ${directory}`);
      }
      return await fs.realpath(directory);
    } catch (error) {
      if (isMissing(error)) return null;
      throw error;
    }
  }

  async function resolveFile(slugValue: string | readonly string[]) {
    const parsed = parseSafeExistingBlogSlug(slugValue);
    const root = await realRoot();
    if (!parsed || !root) throw new ContentNotFoundError("Article not found.");

    let currentPath = root;
    for (const segment of parsed.pathSegments) {
      let entries;
      try {
        entries = await fs.readdir(currentPath, { withFileTypes: true });
      } catch (error) {
        if (isMissing(error)) throw new ContentNotFoundError("Article not found.");
        throw error;
      }
      // Exact-name match keeps case-insensitive filesystems from aliasing URLs.
      const entry = entries.find((candidate) => candidate.name === segment);
      if (!entry || !entry.isDirectory() || entry.isSymbolicLink()) {
        throw new ContentNotFoundError("Article not found.");
      }
      currentPath = path.join(currentPath, entry.name);
    }

    if (!isInsideDirectory(root, currentPath) || currentPath === root) {
      throw new ContentNotFoundError("Article not found.");
    }
    return { ...parsed, filePath: path.join(currentPath, BLOG_POST_FILE_NAME) };
  }

  async function read(slugValue: string | readonly string[]): Promise<ContentArticle> {
    const location = await resolveFile(slugValue);
    if (!(await isRegularFile(location.filePath))) throw new ContentNotFoundError("Article not found.");

    const [source, stats] = await Promise.all([
      fs.readFile(location.filePath, "utf8"),
      fs.stat(location.filePath),
    ]);
    const { content, meta } = parseBlogFrontmatter(source, location.slug, location.pathSegments);

    return {
      content,
      date: meta.date,
      description: meta.summary,
      pathSegments: meta.pathSegments,
      published: meta.published,
      slug: meta.slug,
      tags: meta.tags,
      title: meta.title,
      updatedAt: stats.mtime.toISOString(),
      ...options.readMetadata?.(parseFrontmatter(source).data),
    };
  }

  async function collectSlugs() {
    const root = await realRoot();
    if (!root) return [];
    const slugs: string[] = [];

    for (const rootEntry of await fs.readdir(root, { withFileTypes: true })) {
      if (!rootEntry.isDirectory() || rootEntry.isSymbolicLink()) continue;
      if (!parseSafeExistingBlogSlug(rootEntry.name)) continue;

      if (await isRegularFile(path.join(root, rootEntry.name, BLOG_POST_FILE_NAME))) {
        slugs.push(rootEntry.name);
        continue;
      }

      // A directory without main.md may be a two-level series.
      for (const childEntry of await fs.readdir(path.join(root, rootEntry.name), { withFileTypes: true })) {
        const childSlug = `${rootEntry.name}/${childEntry.name}`;
        if (!childEntry.isDirectory() || childEntry.isSymbolicLink()) continue;
        if (!parseSafeExistingBlogSlug(childSlug)) continue;
        if (await isRegularFile(path.join(root, rootEntry.name, childEntry.name, BLOG_POST_FILE_NAME))) {
          slugs.push(childSlug);
        }
      }
    }

    return slugs;
  }

  async function list(input: { status?: "all" | "draft" | "published" } = {}): Promise<ContentArticleListItem[]> {
    const status = input.status ?? "all";
    const articles = await Promise.all((await collectSlugs()).map((slug) => read(slug)));

    return articles
      .map((article) => {
        const item: Partial<ContentArticle> = { ...article };
        delete item.content;
        return item as ContentArticleListItem;
      })
      .filter((article) => status === "all" || article.published === (status === "published"))
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  return { directory, list, read };
}
