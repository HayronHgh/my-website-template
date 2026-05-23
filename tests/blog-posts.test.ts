import { describe, expect, it } from "vitest";
import { parseBlogFrontmatter } from "@/lib/blog/parse-frontmatter";
import { sortPostsByFeaturedRankAndDate } from "@/lib/blog/posts";
import type { BlogPostMeta } from "@/types/blog";

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
---

Body`;
    const { meta, content } = parseBlogFrontmatter(source, "example-post", ["example-post"]);

    expect(meta.title).toBe("Example Post");
    expect(meta.date).toBe("2026-01-02");
    expect(meta.tags).toEqual(["Architecture"]);
    expect(meta.relatedProjects).toEqual(["project-a"]);
    expect(meta.featuredRank).toBe(1);
    expect(content.trim()).toBe("Body");
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
});
