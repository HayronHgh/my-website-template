import { describe, expect, it } from "vitest";
import { createBlogListingFromPosts, getPostBySlug, getPublishedPosts } from "@/lib/blog";
import { parseBlogFrontmatter } from "@/lib/blog/parse-frontmatter";
import { sortPostsByFeaturedRankAndDate } from "@/lib/blog/posts";
import { sortPostsByPublishedOrder } from "@/lib/blog/sorting";
import type { BlogPostListItem, BlogPostMeta } from "@/types/blog";

const createListItem = (
  slug: string,
  overrides: Partial<BlogPostListItem> = {},
): BlogPostListItem => ({
  date: "2026-01-01",
  pathSegments: [slug],
  published: true,
  readTimeMinutes: 5,
  relatedProjects: [],
  slug,
  summary: `${slug} summary`,
  tags: ["General"],
  title: slug,
  ...overrides,
});

describe("blog frontmatter and sorting", () => {
  it("parses frontmatter metadata", () => {
    const source = `---
title: Example Post
date: 2026-01-02
summary: Example summary.
tags:
  - Architecture
relatedProjects:
  - project-a
published: true
featuredRank: 1
order: 2
---

Body`;
    const { meta, content } = parseBlogFrontmatter(source, "example-post", ["example-post"]);

    expect(meta.title).toBe("Example Post");
    expect(meta.date).toBe("2026-01-02");
    expect(meta.tags).toEqual(["Architecture"]);
    expect(meta.relatedProjects).toEqual(["project-a"]);
    expect(meta.featuredRank).toBe(1);
    expect(meta.order).toBe(2);
    expect(content.trim()).toBe("Body");
  });

  it("sorts same-day posts by frontmatter order with stable slug fallback", () => {
    const posts = [
      createListItem("same-day-a", { date: "2026-01-05", order: 1 }),
      createListItem("same-day-c", { date: "2026-01-05", order: 3 }),
      createListItem("same-day-b", { date: "2026-01-05", order: 1 }),
      createListItem("next-day", { date: "2026-01-06" }),
    ];

    expect(sortPostsByPublishedOrder(posts, "newest").map((post) => post.slug)).toEqual([
      "next-day",
      "same-day-c",
      "same-day-a",
      "same-day-b",
    ]);
    expect(sortPostsByPublishedOrder(posts, "oldest").map((post) => post.slug)).toEqual([
      "same-day-a",
      "same-day-b",
      "same-day-c",
      "next-day",
    ]);
  });

  it("sorts featured posts before date-only posts", () => {
    const posts = [
      { slug: "latest", date: "2026-02-01" },
      { slug: "featured-2", date: "2026-01-01", featuredRank: 2 },
      { slug: "featured-1", date: "2026-01-01", featuredRank: 1 },
    ] as BlogPostMeta[];

    expect(sortPostsByFeaturedRankAndDate(posts).map((post) => post.slug)).toEqual([
      "featured-1",
      "featured-2",
      "latest",
    ]);
  });

  it("returns at most three recommended posts ordered by featured rank", () => {
    const posts = [
      createListItem("featured-2", { featuredRank: 2 }),
      createListItem("featured-1", { featuredRank: 1 }),
      createListItem("featured-4", { featuredRank: 4 }),
      createListItem("featured-3", { featuredRank: 3 }),
      createListItem("latest"),
    ];
    const listing = createBlogListingFromPosts(posts);

    expect(listing.featuredPosts.map((post) => post.slug)).toEqual([
      "featured-1",
      "featured-2",
      "featured-3",
    ]);
  });

  it("paginates latest posts and preloads the next page", () => {
    const latestPosts = Array.from({ length: 12 }, (_, index) =>
      createListItem(`latest-${index + 1}`, {
        date: `2026-01-${String(20 - index).padStart(2, "0")}`,
      }),
    );
    const posts = [
      createListItem("featured-1", { featuredRank: 1, date: "2026-02-01" }),
      createListItem("featured-2", { featuredRank: 2, date: "2026-02-02" }),
      createListItem("featured-3", { featuredRank: 3, date: "2026-02-03" }),
      ...latestPosts,
    ];
    const pageOne = createBlogListingFromPosts(posts, { page: 1 });
    const pageTwo = createBlogListingFromPosts(posts, { page: 2 });
    const recommendedSlugs = new Set(pageOne.featuredPosts.map((post) => post.slug));

    expect(pageOne.page.posts).toHaveLength(5);
    expect(pageOne.prefetchedPage?.page).toBe(2);
    expect(pageOne.page.posts.every((post) => !recommendedSlugs.has(post.slug))).toBe(true);
    expect(pageTwo.page.page).toBe(2);
    expect(pageTwo.prefetchedPage?.page).toBe(3);
  });

  it("paginates search results without a recommended section", () => {
    const posts = Array.from({ length: 7 }, (_, index) =>
      createListItem(`react-${index + 1}`, {
        summary: "React rendering notes",
        tags: ["React"],
      }),
    );
    const listing = createBlogListingFromPosts(posts, { query: "react" });

    expect(listing.featuredPosts).toEqual([]);
    expect(listing.page.posts).toHaveLength(5);
    expect(listing.prefetchedPage?.posts).toHaveLength(2);
  });

  it("builds series options with article counts", () => {
    const posts = [
      createListItem("architecture-a", {
        series: { slug: "architecture", title: "Architecture" },
      }),
      createListItem("architecture-b", {
        series: { slug: "architecture", title: "Architecture" },
      }),
      createListItem("standalone"),
    ];
    const listing = createBlogListingFromPosts(posts);

    expect(listing.seriesOptions).toEqual([
      { count: 2, slug: "architecture", title: "Architecture" },
      { count: 1, slug: "__standalone", title: "Standalone" },
    ]);
  });

  it("shows selected series without recommended posts and sorts newest first by default", () => {
    const posts = [
      createListItem("old", {
        date: "2026-01-01",
        featuredRank: 1,
        series: { slug: "architecture", title: "Architecture" },
      }),
      createListItem("new", {
        date: "2026-01-03",
        featuredRank: 2,
        series: { slug: "architecture", title: "Architecture" },
      }),
      createListItem("other", {
        date: "2026-01-04",
        series: { slug: "workflow", title: "Workflow" },
      }),
    ];
    const listing = createBlogListingFromPosts(posts, { seriesSlug: "architecture" });

    expect(listing.featuredPosts).toEqual([]);
    expect(listing.selectedSeriesSlug).toBe("architecture");
    expect(listing.page.posts.map((post) => post.slug)).toEqual(["new", "old"]);
  });

  it("sorts selected series oldest first when requested", () => {
    const posts = [
      createListItem("old", {
        date: "2026-01-01",
        series: { slug: "architecture", title: "Architecture" },
      }),
      createListItem("new", {
        date: "2026-01-03",
        series: { slug: "architecture", title: "Architecture" },
      }),
    ];
    const listing = createBlogListingFromPosts(posts, {
      seriesSlug: "architecture",
      sortOrder: "oldest",
    });

    expect(listing.sortOrder).toBe("oldest");
    expect(listing.page.posts.map((post) => post.slug)).toEqual(["old", "new"]);
  });

  it("applies same-day post order in listings", () => {
    const posts = [
      createListItem("first", { date: "2026-01-01", order: 1 }),
      createListItem("third", { date: "2026-01-01", order: 3 }),
      createListItem("second", { date: "2026-01-01", order: 2 }),
    ];
    const newest = createBlogListingFromPosts(posts, { sortOrder: "newest" });
    const oldest = createBlogListingFromPosts(posts, { sortOrder: "oldest" });

    expect(newest.page.posts.map((post) => post.slug)).toEqual(["third", "second", "first"]);
    expect(oldest.page.posts.map((post) => post.slug)).toEqual(["first", "second", "third"]);
  });

  it("keeps published posts usable for routed pages and component readers", async () => {
    const posts = await getPublishedPosts();
    const firstPost = posts[0];

    expect(firstPost).toBeDefined();
    if (!firstPost) {
      throw new Error("Expected at least one published blog post.");
    }

    expect(firstPost.slug).not.toContain("..");
    expect(firstPost.html.trim().length).toBeGreaterThan(0);

    const routedPost = await getPostBySlug(firstPost.slug);

    expect(routedPost?.published).toBe(true);
    expect(routedPost?.html.trim().length).toBeGreaterThan(0);
  });
});
