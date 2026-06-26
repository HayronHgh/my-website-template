import { getPublishedPostListItems, sortPostsByFeaturedRankAndDate } from "@/lib/blog/posts";
import {
  createBlogSearchIndex,
  getIndexedSeriesPosts,
  searchIndexedBlogPosts,
} from "@/lib/blog/search-index";
import { sortPostsByPublishedOrder } from "@/lib/blog/sorting";
import type {
  BlogPostListItem,
  BlogPostListing,
  BlogPostListingPage,
  BlogSortOrder,
} from "@/types/blog";

export const BLOG_FEATURED_LIMIT = 3;
export const BLOG_POSTS_PER_PAGE = 5;

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

export function createBlogListingFromPosts(
  posts: BlogPostListItem[],
  options: BlogListingOptions = {},
): BlogPostListing {
  const page = normalizePage(options.page);
  const query = options.query?.trim() ?? "";
  const sortOrder = normalizeSortOrder(options.sortOrder);
  const searchIndex = createBlogSearchIndex(posts);
  const seriesOptions = searchIndex.seriesOptions;
  const selectedSeriesSlug = seriesOptions.some((series) => series.slug === options.seriesSlug)
    ? options.seriesSlug
    : undefined;
  const isSearching = query.length > 0;
  const isSeriesMode = Boolean(selectedSeriesSlug);
  const filteredBySeries = selectedSeriesSlug
    ? getIndexedSeriesPosts(searchIndex, selectedSeriesSlug)
    : posts;
  const featuredPosts = isSearching || isSeriesMode
    ? []
    : sortPostsByFeaturedRankAndDate(
        posts.filter((post) => typeof post.featuredRank === "number"),
      ).slice(0, BLOG_FEATURED_LIMIT);
  const featuredSlugs = new Set(featuredPosts.map((post) => post.slug));
  const searchSource = isSearching
    ? searchIndexedBlogPosts(searchIndex, {
        query,
        seriesSlug: selectedSeriesSlug,
      })
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
