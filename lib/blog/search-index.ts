import { comparePostsByPublishedOrder } from "@/lib/blog/sorting";
import {
  getTagSearchKey,
  parseBlogSearchQuery,
  scoreBlogPost,
} from "@/lib/blog/search";
import type {
  BlogPostListItem,
  BlogSeriesOption,
} from "@/types/blog";

export const BLOG_STANDALONE_SERIES_SLUG = "__standalone";

type BlogSearchDocument = {
  post: BlogPostListItem;
  tagKeys: string[];
};

export type BlogSearchIndex = {
  documentsBySlug: Map<string, BlogSearchDocument>;
  posts: BlogPostListItem[];
  seriesOptions: BlogSeriesOption[];
  seriesSlugs: Map<string, Set<string>>;
  signature: string;
  tagSlugs: Map<string, Set<string>>;
};

type BlogIndexedSearchOptions = {
  query?: string;
  seriesSlug?: string;
};

let cachedIndex: BlogSearchIndex | undefined;

export function getPostSeriesSlug(post: BlogPostListItem) {
  return post.series?.slug ?? BLOG_STANDALONE_SERIES_SLUG;
}

function getPostSeriesTitle(post: BlogPostListItem) {
  return post.series?.title ?? "Standalone";
}

function addSlugToIndex(index: Map<string, Set<string>>, key: string, slug: string) {
  const currentSlugs = index.get(key) ?? new Set<string>();
  currentSlugs.add(slug);
  index.set(key, currentSlugs);
}

function createIndexSignature(posts: BlogPostListItem[]) {
  return posts
    .map((post) =>
      [
        post.slug,
        post.date,
        post.order ?? "",
        post.title,
        post.summary,
        post.tags.join(","),
        post.published ? "1" : "0",
        post.coverImage ?? "",
        post.featuredRank ?? "",
        post.relatedProjects?.join(",") ?? "",
        post.series?.slug ?? "",
        post.series?.title ?? "",
        post.readTimeMinutes,
      ].join("\u001f"),
    )
    .join("\u001e");
}

function createSeriesOptions(posts: BlogPostListItem[]): BlogSeriesOption[] {
  const seriesMap = new Map<string, BlogSeriesOption>();

  posts.forEach((post) => {
    const slug = getPostSeriesSlug(post);
    const currentOption = seriesMap.get(slug) ?? {
      count: 0,
      slug,
      title: getPostSeriesTitle(post),
    };

    currentOption.count += 1;
    seriesMap.set(slug, currentOption);
  });

  return [...seriesMap.values()].sort((left, right) => {
    if (left.slug === BLOG_STANDALONE_SERIES_SLUG) {
      return 1;
    }

    if (right.slug === BLOG_STANDALONE_SERIES_SLUG) {
      return -1;
    }

    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return left.title.localeCompare(right.title);
  });
}

function intersectSlugSets(slugSets: Set<string>[]) {
  if (slugSets.length === 0) {
    return null;
  }

  const [smallestSet, ...remainingSets] = [...slugSets].sort((left, right) =>
    left.size - right.size,
  );

  return new Set(
    [...smallestSet].filter((slug) => remainingSets.every((set) => set.has(slug))),
  );
}

export function createBlogSearchIndex(posts: BlogPostListItem[]): BlogSearchIndex {
  const signature = createIndexSignature(posts);

  if (cachedIndex?.signature === signature) {
    return cachedIndex;
  }

  const documentsBySlug = new Map<string, BlogSearchDocument>();
  const tagSlugs = new Map<string, Set<string>>();
  const seriesSlugs = new Map<string, Set<string>>();

  posts.forEach((post) => {
    const tagKeys = post.tags.map(getTagSearchKey);

    documentsBySlug.set(post.slug, {
      post,
      tagKeys,
    });
    tagKeys.forEach((tagKey) => addSlugToIndex(tagSlugs, tagKey, post.slug));
    addSlugToIndex(seriesSlugs, getPostSeriesSlug(post), post.slug);
  });

  cachedIndex = {
    documentsBySlug,
    posts,
    seriesOptions: createSeriesOptions(posts),
    seriesSlugs,
    signature,
    tagSlugs,
  };

  return cachedIndex;
}

export function getIndexedSeriesPosts(index: BlogSearchIndex, seriesSlug?: string) {
  if (!seriesSlug) {
    return index.posts;
  }

  const seriesPostSlugs = index.seriesSlugs.get(seriesSlug);

  if (!seriesPostSlugs) {
    return [];
  }

  return [...seriesPostSlugs]
    .map((slug) => index.documentsBySlug.get(slug)?.post)
    .filter((post): post is BlogPostListItem => Boolean(post));
}

export function searchIndexedBlogPosts(
  index: BlogSearchIndex,
  { query = "", seriesSlug }: BlogIndexedSearchOptions = {},
) {
  const parsedQuery = parseBlogSearchQuery(query);
  const slugSets = [
    ...(seriesSlug ? [index.seriesSlugs.get(seriesSlug)] : []),
    ...parsedQuery.tagFilters.map((tagFilter) => index.tagSlugs.get(tagFilter)),
  ];

  if (slugSets.some((slugSet) => !slugSet)) {
    return [];
  }

  const candidateSlugs = intersectSlugSets(slugSets.filter((set): set is Set<string> =>
    Boolean(set),
  ));
  const candidateDocuments = (candidateSlugs ? [...candidateSlugs] : index.posts.map((post) =>
    post.slug,
  ))
    .map((slug) => index.documentsBySlug.get(slug))
    .filter((document): document is BlogSearchDocument => Boolean(document));

  if (parsedQuery.textTerms.length === 0 && parsedQuery.tagFilters.length === 0) {
    return candidateDocuments.map(({ post }) => post);
  }

  return candidateDocuments
    .map((document) => ({
      post: document.post,
      score: scoreBlogPost(document.post, parsedQuery, document.tagKeys),
    }))
    .filter((entry): entry is { post: BlogPostListItem; score: number } => entry.score !== null)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return comparePostsByPublishedOrder(left.post, right.post, "newest");
    })
    .map((entry) => entry.post);
}
