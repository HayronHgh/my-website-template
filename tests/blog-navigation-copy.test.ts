import { describe, expect, it } from "vitest";
import { getArticleBackLabel } from "@/lib/blog/navigation-copy";

describe("article back label", () => {
  it.each(["Back to notes", "Back to articles", " back to NOTES "])("normalizes legacy runtime copy: %s", (label) => {
    expect(getArticleBackLabel(label)).toBe("Back");
  });
  it.each(["Back", "返回文章列表", "Return to collection"])("preserves intentional custom copy: %s", (label) => {
    expect(getArticleBackLabel(label)).toBe(label);
  });
});
