import { promises as fs } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { markdownToHtml } from "@/lib/blog/markdown";

async function createTemporaryMarkdownAsset() {
  const slug = `markdown-asset-test-${process.pid}-${Date.now()}`;
  const postDirectory = path.join(process.cwd(), "content", "blog", slug);
  const assetFilePath = path.join(postDirectory, "diagram.png");
  const videoFilePath = path.join(postDirectory, "demo.mp4");

  await fs.mkdir(postDirectory, { recursive: true });
  await fs.writeFile(path.join(postDirectory, "main.md"), "# Test post\n", "utf8");
  await fs.writeFile(assetFilePath, "fake image bytes");
  await fs.writeFile(videoFilePath, "fake mp4 bytes");

  const stats = await fs.stat(assetFilePath);
  const videoStats = await fs.stat(videoFilePath);

  return {
    cleanup: () => fs.rm(postDirectory, { force: true, recursive: true }),
    slug,
    version: `${Math.trunc(stats.mtimeMs)}-${stats.size}`,
    videoVersion: `${Math.trunc(videoStats.mtimeMs)}-${videoStats.size}`,
  };
}

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
    expect(html).not.toContain("code-block");
    expect(html).not.toContain(">1</span><span class=\"mord\"><span class=\"mord mathnormal\">a</span>");
    expect(html).toContain('encoding="application/x-tex">a^2+b^2=c^2</annotation>');
  });

  it("renders fenced code metadata with title, line numbers, highlights, and copy button", async () => {
    const html = await markdownToHtml(
      [
        "```ts title=\"app/page.tsx\" {1,3}",
        "const first = 1;",
        "const second = 2;",
        "const third = 3;",
        "```",
      ].join("\n"),
      { slug: "example" },
    );

    expect(html).toContain("code-block");
    expect(html).toContain("app/page.tsx");
    expect(html).toContain("code-block-language");
    expect(html).toContain(">ts</span>");
    expect(html).toContain("data-code-copy=\"true\"");
    expect(html).toContain("code-line-number");
    expect(html).toContain("data-line=\"1\"");
    expect(html).toContain("data-line=\"3\"");
    expect(html.match(/code-line-highlight/g)).toHaveLength(2);
    expect(html).toMatch(/style="color:\s*#[0-9A-Fa-f]{6};?"/);
  });

  it("adds diff classes to diff-style fenced code blocks", async () => {
    const html = await markdownToHtml(
      [
        "```diff",
        "- old line",
        "+ new line",
        "```",
      ].join("\n"),
      { slug: "example" },
    );

    expect(html).toContain("code-line-remove");
    expect(html).toContain("code-line-add");
  });

  it("embeds standalone YouTube links with the privacy-enhanced host", async () => {
    const html = await markdownToHtml("https://www.youtube.com/watch?v=dQw4w9WgXcQ", {
      slug: "example",
    });

    expect(html).toContain("<iframe");
    expect(html).toContain("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
  });

  it("preserves editor sizing for embedded media", async () => {
    const youtube = await markdownToHtml("https://youtu.be/dQw4w9WgXcQ?mediaWidth=640&mediaAspect=16-9");
    const image = await markdownToHtml('![Diagram](diagram.png "media;width=560;aspect=4:3")', { resolveAssetUrl: (asset) => `/projects/assets/demo/${asset}` });
    const video = await markdownToHtml("[Video](assets/demo.mp4?mediaWidth=800&mediaAspect=16-9)", { resolveAssetUrl: (asset) => `/projects/assets/demo/${asset}` });
    expect(youtube).toContain("media-embed"); expect(youtube).toContain("--media-width:640px");
    expect(image).toContain("media-image"); expect(image).toContain("--media-aspect:4/3");
    expect(video).toContain("<video"); expect(video).toContain("/projects/assets/demo/assets/demo.mp4");
  });

  it("emits Mermaid source containers for client-side strict rendering", async () => {
    const html = await markdownToHtml("```mermaid\nflowchart TD\n  A --> B\n```");
    expect(html).toContain('class="mermaid-diagram"');
    expect(html).toContain('class="mermaid-source"');
    expect(html).toContain("flowchart TD");
    expect(html).not.toContain("code-block");
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

  it("versions relative images without rewriting external or unsafe image URLs", async () => {
    const temporaryAsset = await createTemporaryMarkdownAsset();

    try {
      const html = await markdownToHtml(
        [
          "![Local](diagram.png)",
          "![External](https://example.com/image.png)",
          "![Absolute](/site/assets/bg.png)",
          "![Data](data:image/png;base64,abc)",
          "![Anchor](#diagram)",
        ].join("\n\n"),
        { slug: temporaryAsset.slug },
      );

      expect(html).toContain(
        `src="/articles/assets/${temporaryAsset.slug}/diagram.png?v=${temporaryAsset.version}"`,
      );
      expect(html).toContain('src="https://example.com/image.png"');
      expect(html).toContain('src="/site/assets/bg.png"');
      expect(html).not.toContain("data:image");
      expect(html).not.toContain(`/articles/assets/${temporaryAsset.slug}/%23diagram`);

      const videoHtml = await markdownToHtml(
        "[Video](demo.mp4?mediaWidth=800&mediaAspect=16-9)",
        { slug: temporaryAsset.slug },
      );
      expect(videoHtml).toContain("<video");
      expect(videoHtml).toContain(
        `src="/articles/assets/${temporaryAsset.slug}/demo.mp4?v=${temporaryAsset.videoVersion}"`,
      );
    } finally {
      await temporaryAsset.cleanup();
    }
  });
});
