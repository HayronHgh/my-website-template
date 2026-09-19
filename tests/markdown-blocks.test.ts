import { describe, expect, it } from "vitest";
import { splitMarkdownBlocks } from "@/lib/admin/markdown-blocks";

describe("Markdown block splitting", () => {
  it("splits paragraphs without stripping significant indentation", () => {
    expect(splitMarkdownBlocks("    indented code\n\nParagraph")).toEqual([
      "    indented code",
      "Paragraph",
    ]);
  });

  it("keeps blank lines inside fenced blocks", () => {
    expect(
      splitMarkdownBlocks("```mermaid\nflowchart TD\n\n  A --> B\n```\n\nAfter"),
    ).toEqual(["```mermaid\nflowchart TD\n\n  A --> B\n```", "After"]);
  });

  it("returns one editable block for an empty document", () => {
    expect(splitMarkdownBlocks("")).toEqual([""]);
  });
});
