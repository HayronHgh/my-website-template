import { describe, expect, it } from "vitest";
import { getRelatedPostsForProject, getRelatedProjectsForPost } from "@/lib/projects/relations";
import type { ProjectItem } from "@/data/site";
import type { BlogPostMeta } from "@/types/blog";

const project = {
  slug: "project-a",
  title: "Project A",
  category: "Product System",
  summary: "Summary",
  description: "Description",
  tech: ["Next.js"],
  cover: "generated:project-a",
  coverPosition: "center center",
  accent: "cyan",
  detailsUrl: "/projects/project-a",
  caseStudyUrl: "/blog/project-a-case-study",
  relatedTags: ["Architecture"],
} satisfies ProjectItem;

const posts = [
  {
    slug: "architecture-note",
    pathSegments: ["architecture-note"],
    title: "Architecture Note",
    date: "2026-01-01",
    summary: "Summary",
    tags: ["Architecture"],
    published: true,
  },
  {
    slug: "project-a-case-study",
    pathSegments: ["project-a-case-study"],
    title: "Case Study",
    date: "2026-01-02",
    summary: "Summary",
    tags: [],
    published: true,
  },
] satisfies BlogPostMeta[];

describe("project/blog relations", () => {
  it("prioritizes explicit case study relation", () => {
    const relatedPosts = getRelatedPostsForProject(project, posts);

    expect(relatedPosts.map((post) => post.slug)).toEqual([
      "project-a-case-study",
      "architecture-note",
    ]);
  });

  it("finds projects through explicit and tag-based relations", () => {
    const relatedProjects = getRelatedProjectsForPost(
      {
        ...posts[0],
        relatedProjects: ["project-a"],
      },
      [project],
    );

    expect(relatedProjects[0]?.slug).toBe("project-a");
  });
});
