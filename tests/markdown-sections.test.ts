import { describe, expect, it } from "vitest";
import { splitMarkdownSections } from "@/lib/admin/markdown-sections";
import { readDocument, writeDocument } from "@/lib/admin/block-editor-model";
import { createChartSnippet } from "@/lib/content/chart-spec";

describe("section-sized Markdown editing", () => {
  it("opens the requested preface, prose and list as one editing section", () => {
    const source = "## 前言\n\ntest123:\n\n- 1\n- 2\n- 3";
    expect(splitMarkdownSections(source)).toEqual([source]);
    expect(readDocument(source).blocks).toHaveLength(1);
  });
  it("does not split ordinary prose, lists and block quotes at blank lines", () => {
    const source = "first\n\nsecond\n\n- one\n\n- two\n\n> quote\n>\n> continuation";
    expect(splitMarkdownSections(source)).toEqual([source]);
  });
  it("starts a section at each heading, even without a preceding blank line", () => {
    const parts = ["# Title\nintro", "## Part one\n\nbody\n\n- item", "### Part two\nend"];
    const source = parts.join("\n");
    expect(splitMarkdownSections(source)).toEqual(parts);
    expect(writeDocument(readDocument(source))).toBe(source);
  });
  it("starts a new section at a real Markdown horizontal rule", () => {
    expect(splitMarkdownSections("first\n\n---\n\nsecond\n\nthird")).toEqual(["first", "---\n\nsecond\n\nthird"]);
  });
  it("recognizes setext headings instead of treating their underline as a divider", () => {
    expect(splitMarkdownSections("intro\n\nSection\n---\n\nbody")).toEqual(["intro", "Section\n---\n\nbody"]);
  });
  it.each([
    "![image](images/test.png)",
    "[![image](images/test.png)](https://example.com)",
    "[Video](images/test.mp4?mediaWidth=720)",
    "https://youtu.be/dQw4w9WgXc",
    "https://www.youtube.com/watch?v=dQw4w9WgXc",
    "<video src=\"test.mp4\"></video>",
    "| name | value |\n| --- | --- |\n| a | 1 |",
    "```mermaid\nflowchart TD\n\nA --> B\n```",
    "```python\n# not a heading\n\nprint(1)\n```",
    "$$\nx = 1\n\ny = 2\n$$",
    createChartSnippet("bar"), createChartSnippet("pie"), createChartSnippet("line"),
  ])("keeps media and structured content independently editable: %s", (media) => {
    const source = `## 前言\n\nprose\n\n${media}\n\nafter\n\nmore prose`;
    expect(splitMarkdownSections(source)).toEqual(["## 前言\n\nprose", media, "after\n\nmore prose"]);
    expect(writeDocument(readDocument(source))).toBe(source);
  });
  it("does not split headings or rules nested in a quote/list", () => {
    const source = "## Intro\n\n> # quoted title\n>\n> ---\n\n- item\n\n  ## nested heading\n\n  body";
    expect(splitMarkdownSections(source)).toEqual([source]);
  });
  it("keeps inline media and ordinary links within prose", () => {
    const source = "text ![inline](test.png)\n\n[link](https://example.com)\n\nmore";
    expect(splitMarkdownSections(source)).toEqual([source]);
  });
  it.each(["", "\n\n \n", "\n## 前言\r\n\r\ntest123:\r\n\r\n- 1\r\n- 2\r\n\r\n## 後記\r\n\r\nend  \r\n", "\n# title\n\n\ntext  \n\n---\n\nend\n\n"])("preserves exact original Markdown and line endings: %s", (source) => {
    expect(writeDocument(readDocument(source))).toBe(source);
  });
});
