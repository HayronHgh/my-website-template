import { promises as fs } from "node:fs";
import path from "node:path";
import {
  getBlogAssetUrl,
  getPostMarkdownFilePath,
  getSlugFromSegments,
} from "@/lib/blog/assets";
import { BLOG_CONTENT_DIRECTORY, BLOG_POST_FILE_NAME } from "@/lib/blog/constants";
import { markdownToHtml } from "@/lib/blog/markdown";
import { parseBlogFrontmatter } from "@/lib/blog/parse-frontmatter";
import {
  getMtimeCachedValue,
  readTextFileWithMtimeCache,
} from "@/lib/content/cache";
import type { BlogHashtagIndex, BlogPost, BlogPostMeta } from "@/types/blog";

const MAX_POST_DEPTH = 2;

const getPostRank = (post: BlogPostMeta) =>
  typeof post.featuredRank === "number" ? post.featuredRank : Number.POSITIVE_INFINITY;

export const sortPostsByFeaturedRankAndDate = <Post extends BlogPostMeta>(posts: Post[]) =>
  [...posts].sort((left, right) => {
    const leftRank = getPostRank(left);
    const rightRank = getPostRank(right);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    const leftDate = new Date(left.date).getTime();
    const rightDate = new Date(right.date).getTime();
    return rightDate - leftDate;
  });

const toPostMeta = (post: BlogPost): BlogPostMeta => ({
  slug: post.slug,
  pathSegments: post.pathSegments,
  title: post.title,
  date: post.date,
  summary: post.summary,
  tags: post.tags,
  published: post.published,
  coverImage: post.coverImage,
  featuredRank: post.featuredRank,
  relatedProjects: post.relatedProjects,
  series: post.series,
});

async function hasPostMarkdownFile(segments: string[]) {
  const filePath = getPostMarkdownFilePath(segments);

  if (!filePath || path.basename(filePath) !== BLOG_POST_FILE_NAME) {
    return false;
  }

  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectPostSegments(
  directory: string,
  currentSegments: string[] = [],
): Promise<string[][]> {
  if (currentSegments.length > 0 && (await hasPostMarkdownFile(currentSegments))) {
    return [currentSegments];
  }

  if (currentSegments.length >= MAX_POST_DEPTH) {
    return [];
  }

  try {
    const entries = await fs.readdir(directory, {
      withFileTypes: true,
    });

    const childDirectories = entries.filter((entry) => entry.isDirectory());
    const nestedSegments = await Promise.all(
      childDirectories.map((entry) =>
        collectPostSegments(path.join(directory, entry.name), [
          ...currentSegments,
          entry.name,
        ]),
      ),
    );

    return nestedSegments.flat();
  } catch {
    return [];
  }
}

async function getPostSlugs() {
  const postSegments = await collectPostSegments(BLOG_CONTENT_DIRECTORY);
  return postSegments.map((segments) => ({
    pathSegments: segments,
    slug: getSlugFromSegments(segments),
  }));
}

function getPostSourceFilePath(slug: string) {
  const filePath = getPostMarkdownFilePath(slug);

  if (!filePath) {
    throw new Error(`Invalid blog post slug: ${slug}`);
  }

  return filePath;
}

function resolvePostAssetUrls(meta: BlogPostMeta): BlogPostMeta {
  return {
    ...meta,
    coverImage: meta.coverImage ? getBlogAssetUrl(meta.slug, meta.coverImage) : undefined,
  };
}

async function readPostBySlug(slug: string): Promise<BlogPost> {
  const filePath = getPostSourceFilePath(slug);

  return getMtimeCachedValue(`blog-post:${slug}`, filePath, async () => {
    const source = await readTextFileWithMtimeCache(filePath);
    const pathSegments = slug.split("/");
    const { content, meta } = parseBlogFrontmatter(source, slug, pathSegments);
    const resolvedMeta = resolvePostAssetUrls(meta);
    const html = await markdownToHtml(content, { slug });

    return {
      ...resolvedMeta,
      content,
      html,
    };
  });
}

export async function getAllPosts() {
  const postSlugs = await getPostSlugs();
  const posts = await Promise.all(postSlugs.map(({ slug }) => readPostBySlug(slug)));
  return sortPostsByFeaturedRankAndDate(posts);
}

export async function getPublishedPosts() {
  const posts = await getAllPosts();
  return posts.filter((post) => post.published);
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    return await readPostBySlug(slug);
  } catch {
    return null;
  }
}

export async function getLatestPosts(limit: number) {
  const posts = await getPublishedPosts();
  return posts.slice(0, limit);
}

export async function getHashtagIndex(): Promise<BlogHashtagIndex> {
  const posts = await getPublishedPosts();

  return posts.reduce<BlogHashtagIndex>((index, post) => {
    const meta = toPostMeta(post);

    post.tags.forEach((tag) => {
      index[tag] = [...(index[tag] ?? []), meta];
    });

    return index;
  }, {});
}
