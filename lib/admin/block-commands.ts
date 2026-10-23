import { createChartSnippet } from "@/lib/content/chart-spec";

export type BlockCommand = { id: string; label: string; description: string; keywords: string; snippet?: string; caret?: number; media?: "image" | "youtube" | "video" };
export const mermaidSnippet = "```mermaid\nflowchart TD\n  A[開始] --> B{條件}\n  B -->|是| C[完成]\n  B -->|否| D[調整]\n  D --> B\n```";
export const blockCommands: BlockCommand[] = [
  { id: "paragraph", label: "文字段落", description: "一般 Markdown 文字", keywords: "text paragraph 文字 段落", snippet: "" },
  { id: "heading", label: "標題", description: "二級標題", keywords: "heading title h2 標題", snippet: "## ", caret: 3 },
  { id: "image", label: "圖片", description: "上傳圖片、設定替代文字與尺寸", keywords: "image photo 圖片 照片", media: "image" },
  { id: "bar", label: "柱狀圖", description: "比較不同項目的數值", keywords: "bar chart 統計 柱狀 長條 圖表", snippet: createChartSnippet("bar") },
  { id: "pie", label: "圓餅圖", description: "呈現各項比例", keywords: "pie chart 統計 圓餅 比例 圖表", snippet: createChartSnippet("pie") },
  { id: "line", label: "折線圖", description: "呈現時間變化與趨勢", keywords: "line chart 統計 折線 趨勢 圖表", snippet: createChartSnippet("line") },
  { id: "code", label: "程式碼", description: "保留語言標記的 Markdown 程式碼區塊", keywords: "code snippet 程式碼 代碼", snippet: "```text\n\n```", caret: 8 },
  { id: "mermaid", label: "流程圖", description: "Mermaid 圖表", keywords: "mermaid flowchart 流程圖", snippet: mermaidSnippet },
  { id: "list", label: "清單", description: "項目符號清單", keywords: "list bullet 清單 列表", snippet: "- ", caret: 2 },
  { id: "quote", label: "引用", description: "引用文字", keywords: "quote 引用", snippet: "> ", caret: 2 },
  { id: "youtube", label: "YouTube", description: "插入影片網址", keywords: "youtube yt 影片", media: "youtube" },
  { id: "video", label: "MP4 影片", description: "上傳影片檔案", keywords: "video mp4 影片", media: "video" },
];

export function slashQuery(text: string, start: number, end = start): string | null {
  // Only a whole, single-line command at the end of the block. Inline slashes,
  // paths, pasted URLs, fences and selections remain ordinary Markdown.
  if (start !== end || start !== text.length) return null;
  return /^\/([^\n\r/]*)$/.exec(text)?.[1] ?? null;
}

export function matchBlockCommands(query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return blockCommands.filter((command) => terms.every((term) => `${command.label} ${command.keywords}`.toLocaleLowerCase().includes(term)));
}
