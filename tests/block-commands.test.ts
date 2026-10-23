import { describe, expect, it } from "vitest";
import { blockCommands, matchBlockCommands, slashQuery } from "@/lib/admin/block-commands";
import { parseChart } from "@/lib/content/chart-spec";
import { splitMarkdownBlocks } from "@/lib/admin/markdown-blocks";
import { markdownToHtml } from "@/lib/blog/markdown";

describe("slash block commands", () => {
  it.each(["/", "/bar", "/圖片", "/程式碼", "/chart pie"])("opens for a new block command %s", (text) => {
    expect(slashQuery(text, text.length)).toBe(text.slice(1));
  });
  it.each(["https://example.com/", "hello /bar", "/api/assets/test", "```text\n/bar\n```", "a\n/bar", "/bar\n", "![image](/a.png)", "1 / 2", " /bar"])("preserves ordinary Markdown %s", (text) => {
    expect(slashQuery(text, text.length)).toBeNull();
  });
  it("does not execute a command if the caret moved or text is selected", () => {
    expect(slashQuery("/bar", 2)).toBeNull();
    expect(slashQuery("/bar", 0, 4)).toBeNull();
  });
  it("filters English and Chinese keywords case-insensitively", () => {
    expect(matchBlockCommands("BAR").map((command) => command.id)).toEqual(["bar"]);
    expect(matchBlockCommands("chart pie").map((command) => command.id)).toEqual(["pie"]);
    expect(matchBlockCommands("圖表").map((command) => command.id)).toEqual(["bar", "pie", "line"]);
    expect(matchBlockCommands("圖片")[0].media).toBe("image");
    expect(matchBlockCommands("程式碼")[0].id).toBe("code");
    expect(matchBlockCommands("no-such-command")).toEqual([]);
    expect(matchBlockCommands(" ")).toHaveLength(blockCommands.length);
    expect(new Set(blockCommands.map((command) => command.id)).size).toBe(blockCommands.length);
  });
  it.each(["bar", "pie", "line"])("inserts a valid native %s chart, not a static image", async (id) => {
    const snippet = blockCommands.find((command) => command.id === id)!.snippet!;
    expect(splitMarkdownBlocks(snippet)).toEqual([snippet]);
    expect(parseChart(snippet.replace(/^```chart\n/, "").replace(/\n```$/, "")).type).toBe(id);
    const html = await markdownToHtml(snippet);
    expect(html).toContain('class="markdown-chart');
    expect(html).toContain("<svg");
  });
  it("inserts editable fenced code and Mermaid with correct caret positions", async () => {
    const code = blockCommands.find((command) => command.id === "code")!;
    expect(code.snippet!.slice(0, code.caret)).toBe("```text\n");
    expect(splitMarkdownBlocks(code.snippet!)).toHaveLength(1);
    expect(await markdownToHtml(blockCommands.find((command) => command.id === "mermaid")!.snippet!)).toContain("mermaid");
    for (const command of blockCommands) if (command.caret !== undefined) expect(command.caret).toBeLessThanOrEqual(command.snippet!.length);
  });
});
