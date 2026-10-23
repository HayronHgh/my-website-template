import { describe, expect, it } from "vitest";
import { canHandleBlockKey, insertBlock, mergeBlock, readDocument, splitBlock, usesLiteralEnter, writeDocument } from "@/lib/admin/block-editor-model";
import { splitMarkdownBlocks } from "@/lib/admin/markdown-blocks";
import { createChartSnippet } from "@/lib/content/chart-spec";

describe("block editor draft", () => {
  it("does not intercept IME confirmation or modifier shortcuts", () => {
    const event = { isComposing: false, keyCode: 13, ctrlKey: false, metaKey: false, altKey: false };
    expect(canHandleBlockKey(event, false)).toBe(true);
    expect(canHandleBlockKey(event, true)).toBe(false);
    for (const patch of [{ isComposing: true }, { keyCode: 229 }, { ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
      expect(canHandleBlockKey({ ...event, ...patch }, false)).toBe(false);
    }
  });
  it.each(["", "\n\n  \n", "\n# Heading\n\n\nText  \n", "# CRLF\r\n\r\nText\r\n", "  leading\n\n![image](test.png)\n\n[link](https://example.com)", createChartSnippet("bar"), createChartSnippet("pie"), createChartSnippet("line"), "```mermaid\nflowchart TD\n\nA --> B\n```", "$$\nx = 1\n\ny = 2\n$$"])("round trips Markdown without rewriting: %s", (source) => {
    expect(writeDocument(readDocument(source))).toBe(source);
  });
  it.each([0, 1, 2])("inserts at gap %i without changing existing block IDs", (index) => {
    const original = readDocument("first\n\nlast");
    const next = insertBlock(original, index, "new");
    expect(next.document.blocks[index].text).toBe("new");
    expect(next.document.blocks.filter((block) => block.id !== next.id).map((block) => block.id)).toEqual(original.blocks.map((block) => block.id));
    expect(splitMarkdownBlocks(writeDocument(next.document))).toHaveLength(3);
    expect(writeDocument(original)).toBe("first\n\nlast");
  });
  it("keeps multiple empty blocks in memory without placeholder comments", () => {
    const first = insertBlock(readDocument("one"), 1);
    const next = insertBlock(first.document, 2);
    expect(next.document.blocks).toHaveLength(3);
    expect(writeDocument(next.document)).toBe("one\n\n\n\n");
    expect(new Set(next.document.blocks.map((block) => block.id)).size).toBe(3);
  });
  it("splits a selection and merges with caret restored at the boundary", () => {
    const original = readDocument("hello selected world");
    const split = splitBlock(original, 0, 5, 14);
    expect(writeDocument(split.document)).toBe("hello\n\n world");
    const merge = mergeBlock(split.document, 1)!;
    expect(writeDocument(merge.document)).toBe("hello world");
    expect(merge.caret).toBe(5);
    expect(merge.id).toBe(original.blocks[0].id);
    expect(mergeBlock(original, 0)).toBeNull();
  });
  it("removes an empty block after a chart without modifying its JSON", () => {
    const chart = createChartSnippet("bar");
    const inserted = insertBlock(readDocument(chart), 1);
    expect(writeDocument(mergeBlock(inserted.document, 1)!.document)).toBe(chart);
  });
  it.each(["```chart\n{}\n```", "~~~mermaid\nA --> B\n~~~", "| name | count |", "name | count\n--- | ---\na | 1", "- item", "1. item", "> quote", "    code", "$$\nx\n$$"])("keeps Enter literal for structured Markdown: %s", (text) => {
    expect(usesLiteralEnter(text)).toBe(true);
  });
  it("splits prose and headings rather than inline code", () => {
    expect(usesLiteralEnter("hello `code`")).toBe(false);
    expect(usesLiteralEnter("## heading")).toBe(false);
  });
  it("does not close a long fence with a short fence", () => {
    const text = "````markdown\n```chart\n{}\n```\n\nmore\n````\n\nEnd";
    expect(splitMarkdownBlocks(text)).toEqual([text.slice(0, text.lastIndexOf("\n\n")), "End"]);
    expect(writeDocument(readDocument(text))).toBe(text);
  });
});
