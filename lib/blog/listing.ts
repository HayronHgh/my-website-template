import { getPublishedPostListItems, sortPostsByFeaturedRankAndDate } from "@/lib/blog/posts";
import { comparePostsByPublishedOrder, sortPostsByPublishedOrder } from "@/lib/blog/sorting";
import { parseBlogSearchQuery, scoreBlogPost } from "@/lib/blog/search";
import type {
  BlogPostListItem,
  BlogPostListing,
  BlogPostListingPage,
  BlogSeriesOption,
  BlogSortOrder,
} from "@/types/blog";

export const BLOG_FEATURED_LIMIT = 3;
export const BLOG_POSTS_PER_PAGE = 5;
export const BLOG_STANDALONE_SERIES_SLUG = "__standalone";

type BlogListingOptions = {
  page?: number;
  query?: string;
  seriesSlug?: string;
  sortOrder?: BlogSortOrder;
};

const normalizePage = (value: number | undefined) => {
  if (!value || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
};

const normalizeSortOrder = (value: BlogSortOrder | undefined): BlogSortOrder =>
  value === "oldest" ? "oldest" : "newest";

const createPage = (
  posts: BlogPostListItem[],
  page: number,
  pageSize = BLOG_POSTS_PER_PAGE,
): BlogPostListingPage => {
  const totalItems = posts.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (page - 1) * pageSize;

  return {
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1 && totalPages > 0,
    page,
    pageSize,
    posts: posts.slice(startIndex, startIndex + pageSize),
    totalItems,
    totalPages,
  };
};

function filterSearchResults(posts: BlogPostListItem[], query: string) {
  const parsedQuery = parseBlogSearchQuery(query);

  return posts
    .map((post) => ({
      post,
      score: scoreBlogPost(post, parsedQuery),
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

function getPostSeriesSlug(post: BlogPostListItem) {
  return post.series?.slug ?? BLOG_STANDALONE_SERIES_SLUG;
}

function getPostSeriesTitle(post: BlogPostListItem) {
  return post.series?.title ?? "Standalone";
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

export function createBlogListingFromPosts(
  posts: BlogPostListItem[],
  options: BlogListingOptions = {},
): BlogPostListing {
  const page = normalizePage(options.page);
  const query = options.query?.trim() ?? "";
  const sortOrder = normalizeSortOrder(options.sortOrder);
  const seriesOptions = createSeriesOptions(posts);
  const selectedSeriesSlug = seriesOptions.some((series) => series.slug === options.seriesSlug)
    ? options.seriesSlug
    : undefined;
  const isSearching = query.length > 0;
  const isSeriesMode = Boolean(selectedSeriesSlug);
  const filteredBySeries = selectedSeriesSlug
    ? posts.filter((post) => getPostSeriesSlug(post) === selectedSeriesSlug)
    : posts;
  const featuredPosts = isSearching || isSeriesMode
    ? []
    : sortPostsByFeaturedRankAndDate(
        posts.filter((post) => typeof post.featuredRank === "number"),
      ).slice(0, BLOG_FEATURED_LIMIT);
  const featuredSlugs = new Set(featuredPosts.map((post) => post.slug));
  const searchSource = isSearching
    ? filterSearchResults(filteredBySeries, query)
    : filteredBySeries;
  const pageSource = sortPostsByPublishedOrder(
    isSeriesMode || isSearching
      ? searchSource
      : searchSource.filter((post) => !featuredSlugs.has(post.slug)),
    sortOrder,
  );
  const currentPage = createPage(pageSource, page);
  const prefetchedPage = currentPage.hasNextPage
    ? createPage(pageSource, page + 1)
    : undefined;

  return {
    featuredPosts,
    page: currentPage,
    prefetchedPage,
    query,
    selectedSeriesSlug,
    seriesOptions,
    sortOrder,
  };
}

export async function getBlogListing(options: BlogListingOptions = {}) {
  const posts = await getPublishedPostListItems();
  return createBlogListingFromPosts(posts, options);
}
