import { describe, expect, it } from "vitest";
import { markdownToHtml } from "@/lib/blog/markdown";
import { chartScale } from "@/lib/content/chart-renderer";
import { chartTypes, createChartSnippet, parseChart } from "@/lib/content/chart-spec";
import { splitMarkdownBlocks } from "@/lib/admin/markdown-blocks";

const spec = {
  type: "bar", title: "完成題數", unit: "題", labels: ["一週", "二週", "三週"],
  series: [{ name: "本週", values: [8, 12, 0] }, { name: "上週", values: [6, 9, -2] }],
};
const fence = (value: unknown) => "```chart\n" + JSON.stringify(value) + "\n```";

describe("Markdown statistical charts", () => {
  it.each(chartTypes)("renders the %s toolbar template as server-side SVG with data table", async (type) => {
    const html = await markdownToHtml(createChartSnippet(type));
    expect(html).toContain(`data-chart-type="${type}"`);
    expect(html).toContain('<svg xmlns="http://www.w3.org/2000/svg"');
    expect(html).toContain('role="img"');
    expect(html).toContain("查看原始數據");
    expect(html).toContain('<th scope="col">');
    expect(html).not.toContain("chart-error");
    expect(html).not.toContain("code-copy-button");
    expect(html).not.toContain("NaN");
  });

  it("supports grouped bars, negative values, zeroes and original exact table data", async () => {
    const html = await markdownToHtml(fence(spec));
    expect(html).toContain("chart-zero");
    expect(html.match(/class="chart-bar"/g)).toHaveLength(6);
    expect(html).toContain('<td>-2</td>');
    expect(html).toContain('height="0"');
    expect(html).toContain("上週");
    expect(html).not.toMatch(/height="-/);
  });

  it("renders one line per series and square markers for single data points", async () => {
    const html = await markdownToHtml(fence({ ...spec, type: "line", labels: ["今天"],
      series: [{ name: "A", values: [0] }, { name: "B", values: [-2] }] }));
    expect(html.match(/<polyline /g)).toHaveLength(2);
    expect(html).toContain('width="8" height="8"');
    expect(html).not.toMatch(/NaN|Infinity/);
  });

  it("renders a full circle for a single nonzero pie segment and includes zero categories", async () => {
    const html = await markdownToHtml(fence({ ...spec, type: "pie", labels: ["有", "無"],
      series: [{ name: "數量", values: [7, 0] }] }));
    expect(html).toContain('<circle cx="160" cy="160" r="130"');
    expect(html).toContain("100.0%");
    expect(html).toContain("0.0%");
    expect(html).not.toContain("chart-error");
  });

  it.each([
    { ...spec, labels: [] },
    { ...spec, series: [{ name: "錯誤", values: [1] }] },
    { ...spec, series: [{ name: "字串", values: ["1", "2", "3"] }] },
    { ...spec, type: "pie" },
    { ...spec, type: "pie", series: [{ name: "負值", values: [-1, 2, 3] }] },
    { ...spec, type: "pie", series: [{ name: "零", values: [0, 0, 0] }] },
    { ...spec, labels: Array(25).fill("太多") },
    { ...spec, series: Array(5).fill({ name: "太多", values: [1, 2, 3] }) },
    { ...spec, series: [{ name: "過大", values: [1e13, 1, 2] }] },
    { ...spec, script: "alert(1)" },
  ])("shows a recoverable validation message for invalid input %#", async (value) => {
    const html = await markdownToHtml(fence(value));
    expect(html).toContain("chart-error");
    expect(html).toContain("圖表資料需要調整");
    expect(html).not.toContain("<svg");
  });

  it("handles invalid JSON, huge payloads and nonfinite JSON numbers", async () => {
    const broken = await markdownToHtml('```chart\n{"type":\n```\n\nAfter');
    expect(broken).toContain("有效的 JSON");
    expect(broken).toContain("<p>After</p>");
    expect(() => parseChart(" ".repeat(40001))).toThrow("40,000");
    expect(() => parseChart(JSON.stringify(spec).replace('8,12,0', '1e999,12,0'))).toThrow();
  });

  it("escapes titles, labels and rejected code instead of enabling HTML or SVG injection", async () => {
    const attack = '</title><script>alert(1)</script><img src=x onerror=alert(1)>';
    const html = await markdownToHtml(fence({ type: "pie", title: attack, labels: ["<svg onload=alert(1)>"],
      series: [{ name: "safe", values: [1] }] }));
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<svg onload");
    expect(html).toContain("&#x3C;script>");
    expect(html).toContain("data-chart-type");
    const rejected = await markdownToHtml('```chart\n<script>alert(1)</script>\n```');
    expect(rejected).not.toContain("<script>");
  });

  it.each([[0, 0], [-3, -1], [-5, 10], [0.1, 0.3], [1e12, -1e12], [Number.MIN_VALUE]])(
    "keeps a finite, nonzero axis range for %j", (...values) => {
      const scale = chartScale(values);
      expect(Number.isFinite(scale.min)).toBe(true);
      expect(Number.isFinite(scale.max)).toBe(true);
      expect(scale.max).toBeGreaterThan(scale.min);
      expect(scale.step).toBeGreaterThan(0);
      expect(scale.min).toBeLessThanOrEqual(Math.min(...values));
      expect(scale.max).toBeGreaterThanOrEqual(Math.max(...values));
    });

  it("keeps a complete chart template in one editable Markdown block", () => {
    const snippet = createChartSnippet("bar");
    expect(splitMarkdownBlocks("Before\n\n" + snippet + "\n\nAfter")).toEqual(["Before", snippet, "After"]);
  });
});
