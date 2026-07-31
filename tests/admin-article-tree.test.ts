import { describe, expect, it } from "vitest";
import {
  getAdminArticleGroupKey,
  getAdminArticleLeafSlug,
  groupAdminArticles,
  ROOT_ARTICLE_GROUP_KEY,
} from "@/lib/admin/article-tree";
import type { AdminArticleListItem } from "@/types/admin";

function createArticle(slug: string, title = slug): AdminArticleListItem {
  return {
    date: "2026-08-01",
    description: `${title} description`,
    pathSegments: slug.split("/"),
    published: false,
    revision: "a".repeat(64),
    slug,
    tags: ["CMS"],
    title,
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

describe("admin article tree", () => {
  it("groups root posts separately and preserves legacy category spelling", () => {
    const root = createArticle("ReleaseNotes");
    const caseStudy = createArticle("CaseStudy/AdminCMS");
    const leetCode = createArticle("LeetCodeEssential150/2.AddTwoNumbers");
    const groups = groupAdminArticles([leetCode, root, caseStudy]);

    expect(groups.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: ROOT_ARTICLE_GROUP_KEY, label: "根目錄" },
      { key: getAdminArticleGroupKey("CaseStudy"), label: "CaseStudy" },
      { key: getAdminArticleGroupKey("LeetCodeEssential150"), label: "LeetCodeEssential150" },
    ]);
    expect(groups[2]?.articles).toEqual([leetCode]);
  });

  it("does not merge a category that resembles the internal root key", () => {
    const groups = groupAdminArticles([
      createArticle("root:"),
      createArticle("root:/NestedPost"),
    ]);

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.key)).toEqual([
      ROOT_ARTICLE_GROUP_KEY,
      getAdminArticleGroupKey("root:"),
    ]);
  });

  it("shows only the leaf slug beneath a category", () => {
    expect(getAdminArticleLeafSlug(createArticle("CaseStudy/SecureCMS"))).toBe("SecureCMS");
    expect(getAdminArticleLeafSlug(createArticle("RootPost"))).toBe("RootPost");
  });
});
