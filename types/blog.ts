export type BlogSeriesMeta = {
  slug: string;
  title: string;
};

export type BlogPostMeta = {
  slug: string;
  pathSegments: string[];
  title: string;
  date: string;
  order?: number;
  summary: string;
  tags: string[];
  published: boolean;
  coverImage?: string;
  featuredRank?: number;
  relatedProjects?: string[];
  series?: BlogSeriesMeta;
};

export type BlogPost = BlogPostMeta & {
  content: string;
  html: string;
};

export type BlogPostListItem = BlogPostMeta & {
  readTimeMinutes: number;
};

export type BlogSortOrder = "newest" | "oldest";

export type BlogSeriesOption = {
  count: number;
  slug: string;
  title: string;
};

export type BlogPostListingPage = {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  page: number;
  pageSize: number;
  posts: BlogPostListItem[];
  totalItems: number;
  totalPages: number;
};

export type BlogPostListing = {
  featuredPosts: BlogPostListItem[];
  page: BlogPostListingPage;
  prefetchedPage?: BlogPostListingPage;
  query: string;
  selectedSeriesSlug?: string;
  seriesOptions: BlogSeriesOption[];
  sortOrder: BlogSortOrder;
};

export type BlogTagOption = {
  tag: string;
  count: number;
};

export type BlogHashtagIndex = Record<string, BlogPostMeta[]>;

export type BlogPostFrontmatter = Omit<
  BlogPostMeta,
  "slug" | "pathSegments" | "series"
> & {
  series?: string;
};

export const DEFAULT_BLOG_POST_FRONTMATTER: BlogPostFrontmatter = {
  title: "Untitled Post",
  date: "1970-01-01",
  summary: "No summary provided.",
  tags: [],
  published: false,
};
