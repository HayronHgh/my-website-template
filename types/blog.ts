export type BlogSeriesMeta = {
  slug: string;
  title: string;
};

export type BlogPostMeta = {
  slug: string;
  pathSegments: string[];
  title: string;
  date: string;
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
