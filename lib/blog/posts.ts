import { promises as fs } from "node:fs";
import path from "node:path";
import {
  getSafePostMarkdownFilePath,
  getSlugFromSegments,
  getVersionedBlogAssetUrl,
} from "@/lib/blog/assets";
import { BLOG_CONTENT_DIRECTORY, BLOG_POST_FILE_NAME } from "@/lib/blog/constants";
import { markdownToHtml } from "@/lib/blog/markdown";
import { parseBlogFrontmatter } from "@/lib/blog/parse-frontmatter";
import {
  getMtimeCachedValue,
  readTextFileWithMtimeCache,
} from "@/lib/content/cache";
import { sortPostsByFeaturedRankAndPublishedOrder } from "@/lib/blog/sorting";
import type {
  BlogHashtagIndex,
  BlogPost,
  BlogPostListItem,
  BlogPostMeta,
} from "@/types/blog";

const MAX_POST_DEPTH = 2;

export function estimateReadTimeMinutes(content: string) {
  const cjkCharacters = content.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const estimatedUnits = words + cjkCharacters / 2;

  return Math.max(5, Math.ceil(estimatedUnits / 180));
}

export const sortPostsByFeaturedRankAndDate = <Post extends BlogPostMeta>(posts: Post[]) =>
  sortPostsByFeaturedRankAndPublishedOrder(posts);

const toPostMeta = (post: BlogPostMeta): BlogPostMeta => ({
  slug: post.slug,
  pathSegments: post.pathSegments,
  title: post.title,
  date: post.date,
  order: post.order,
  summary: post.summary,
  tags: post.tags,
  published: post.published,
  coverImage: post.coverImage,
  featuredRank: post.featuredRank,
  relatedProjects: post.relatedProjects,
  series: post.series,
});

async function hasPostMarkdownFile(segments: string[]) {
  const filePath = await getSafePostMarkdownFilePath(segments);
  return Boolean(filePath && path.basename(filePath) === BLOG_POST_FILE_NAME);
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

async function getPostSourceFilePath(slug: string) {
  const filePath = await getSafePostMarkdownFilePath(slug);

  if (!filePath) {
    throw new Error(`Invalid blog post slug: ${slug}`);
  }

  return filePath;
}

async function resolvePostAssetUrls<Post extends BlogPostMeta>(meta: Post): Promise<Post> {
  return {
    ...meta,
    coverImage: meta.coverImage
      ? await getVersionedBlogAssetUrl(meta.slug, meta.coverImage)
      : undefined,
  };
}

async function readPostListItemBySlug(slug: string): Promise<BlogPostListItem> {
  const filePath = await getPostSourceFilePath(slug);

  const listItem = await getMtimeCachedValue(`blog-post-list-item:${slug}`, filePath, async () => {
    const source = await readTextFileWithMtimeCache(filePath);
    const pathSegments = slug.split("/");
    const { content, meta } = parseBlogFrontmatter(source, slug, pathSegments);

    return {
      ...meta,
      readTimeMinutes: estimateReadTimeMinutes(content),
    };
  });

  return resolvePostAssetUrls(listItem);
}

async function readPostBySlug(slug: string): Promise<BlogPost> {
  const filePath = await getPostSourceFilePath(slug);

  const postSource = await getMtimeCachedValue(`blog-post:${slug}`, filePath, async () => {
    const source = await readTextFileWithMtimeCache(filePath);
    const pathSegments = slug.split("/");
    const { content, meta } = parseBlogFrontmatter(source, slug, pathSegments);

    return {
      ...meta,
      content,
    };
  });
  const resolvedMeta = await resolvePostAssetUrls(postSource);
  const html = await markdownToHtml(postSource.content, { slug });

  return {
    ...resolvedMeta,
    html,
  };
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

export async function getAllPostListItems() {
  const postSlugs = await getPostSlugs();
  const posts = await Promise.all(postSlugs.map(({ slug }) => readPostListItemBySlug(slug)));
  return sortPostsByFeaturedRankAndDate(posts);
}

export async function getPublishedPostListItems() {
  const posts = await getAllPostListItems();
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
  const posts = await getPublishedPostListItems();

  return posts.reduce<BlogHashtagIndex>((index, post) => {
    const meta = toPostMeta(post);

    post.tags.forEach((tag) => {
      index[tag] = [...(index[tag] ?? []), meta];
    });

    return index;
  }, {});
}
