import { describe, expect, it } from "vitest";
import { markdownToHtml } from "@/lib/blog/markdown";

describe("markdown rendering", () => {
  it("renders GFM tables", async () => {
    const html = await markdownToHtml("| A | B |\n| - | - |\n| 1 | 2 |", {
      slug: "example",
    });

    expect(html).toContain("<table>");
    expect(html).toContain("<th>A</th>");
    expect(html).toContain("<td>1</td>");
  });

  it("renders inline LaTeX", async () => {
    const html = await markdownToHtml("Inline $a^2+b^2=c^2$ text.", {
      slug: "example",
    });

    expect(html).toContain("katex");
    expect(html).toContain("<math");
    expect(html).toContain("style=");
  });

  it("renders display LaTeX", async () => {
    const html = await markdownToHtml("$$\na^2+b^2=c^2\n$$", {
      slug: "example",
    });

    expect(html).toContain("katex-display");
    expect(html).toContain("<math");
  });

  it("embeds standalone YouTube links with the privacy-enhanced host", async () => {
    const html = await markdownToHtml("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      slug: "example",
    });

    expect(html).toContain("<iframe");
    expect(html).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("keeps inline YouTube links as normal links", async () => {
    const html = await markdownToHtml(
      "Watch https://www.youtube.com/watch?v=dQw4w9WgXcQ later.",
      { slug: "example" },
    );

    expect(html).not.toContain("<iframe");
    expect(html).toContain("<a href=\"https://www.youtube.com/watch?v=dQw4w9WgXcQ\"");
  });

  it("does not embed non-YouTube standalone links", async () => {
    const html = await markdownToHtml("https://example.com/video", {
      slug: "example",
    });

    expect(html).not.toContain("<iframe");
    expect(html).toContain("<a href=\"https://example.com/video\"");
  });
});
