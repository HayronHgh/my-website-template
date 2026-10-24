import { describe, expect, it } from "vitest";
import { canHandleBlockKey, insertBlock, mergeBlock, moveBlock, readDocument, removeBlock, splitBlock, usesLiteralEnter, writeDocument } from "@/lib/admin/block-editor-model";
import { splitMarkdownBlocks } from "@/lib/admin/markdown-blocks";
import { createChartSnippet } from "@/lib/content/chart-spec";

// Manually inserted blocks remain distinct in the live draft, even when the
// text would be grouped as one section after reloading the Markdown document.
function documentWithBlocks(...parts: string[]) {
  let document = readDocument(parts[0] ?? "");
  for (const text of parts.slice(1)) document = insertBlock(document, document.blocks.length, text).document;
  return document;
}

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
    const original = documentWithBlocks("first", "last");
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
  it("moves the first block to the end without concatenating Markdown", () => {
    const document = documentWithBlocks("first", "second", "third");
    const moved = moveBlock(document, document.blocks[0].id, 3);
    expect(writeDocument(moved)).toBe("second\n\nthird\n\nfirst");
    expect(moved.blocks.map((block) => block.id)).toEqual([document.blocks[1].id, document.blocks[2].id, document.blocks[0].id]);
    expect(writeDocument(document)).toBe("first\n\nsecond\n\nthird");
  });
  it("moves the last block to the beginning and retains whitespace slots", () => {
    const draft = documentWithBlocks("first", "second", "third");
    const document = { ...draft, blocks: draft.blocks.map((block, index) => ({ ...block, before: ["\n", "\n\n\n", "\n\n"][index] })), tail: "\n" };
    const moved = moveBlock(document, document.blocks[2].id, 0);
    expect(writeDocument(moved)).toBe("\nthird\n\n\nfirst\n\nsecond\n");
    expect(moved.tail).toBe(document.tail);
  });
  it("preserves fenced charts, images and code through every reorder position", () => {
    const parts = ["# title", createChartSnippet("pie"), '![test](images/a.png "media;width=720;aspect=16:9")', "```python\nprint(1)\n\nprint(2)\n```"];
    for (let from = 0; from < parts.length; from++) {
      for (let gap = 0; gap <= parts.length; gap++) {
        const document = readDocument(parts.join("\n\n"));
        const moved = moveBlock(document, document.blocks[from].id, gap);
        const expected = [...parts];
        const [item] = expected.splice(from, 1);
        expected.splice(gap > from ? gap - 1 : gap, 0, item);
        expect(splitMarkdownBlocks(writeDocument(moved))).toEqual(expected);
        expect(new Set(moved.blocks.map((block) => block.id)).size).toBe(parts.length);
      }
    }
  });
  it("ignores unknown, out-of-range and no-op moves", () => {
    const document = documentWithBlocks("one", "two");
    const id = document.blocks[0].id;
    for (const gap of [-1, 0, 1, 3, 0.5, Number.NaN]) expect(moveBlock(document, id, gap)).toBe(document);
    expect(moveBlock(document, "missing", 1)).toBe(document);
  });
  it.each([0, 1, 2])("deletes block %i without changing the remaining Markdown or assets", (index) => {
    const parts = ["first", createChartSnippet("line"), "![image](images/retained.png)"];
    const document = readDocument(parts.join("\n\n"));
    const removed = removeBlock(document, document.blocks[index].id);
    expect(writeDocument(removed)).toBe(parts.filter((_, i) => i !== index).join("\n\n"));
    expect(writeDocument(document)).toBe(parts.join("\n\n"));
  });
  it("deleting the last block leaves an editable empty document", () => {
    const document = readDocument("\n```chart\n{}\n```\n\n");
    const removed = removeBlock(document, document.blocks[0].id);
    expect(removed.blocks).toHaveLength(1);
    expect(writeDocument(removed)).toBe("");
    expect(removed.blocks[0].id).toBe(document.blocks[0].id);
    expect(removeBlock(document, "missing")).toBe(document);
  });
});
