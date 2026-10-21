import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { markdownToHtml } from "../lib/blog/markdown";

async function main() {
  const source = await readFile("docs/examples/statistical-charts.md", "utf8");
  const css = await readFile("app/charts.css", "utf8");
  const content = await markdownToHtml(source);
  const html = `<!doctype html><html lang="zh-Hant"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Markdown 圖表示範</title><style>
    *{box-sizing:border-box}body{margin:0;background:#0f1325;color:#e2effa;font-family:monospace;line-height:1.8}
    main{width:min(900px,100%);padding:32px 20px;margin:auto}h1{font-size:28px}p{color:#aebed0}
    table{border-collapse:collapse;width:100%}th,td{padding:8px 12px;border:1px solid #20334b}td{text-align:right}
    ${css}</style><main class="prose-content">${content}</main></html>`;
  const server = createServer((_request, response) => {
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; base-uri 'none'; frame-ancestors 'none'" });
    response.end(html);
  });
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    if (address && typeof address !== "string") console.log(`Chart preview: http://127.0.0.1:${address.port}`);
  });
  setTimeout(() => server.close(), 15 * 60 * 1000).unref();
}
void main();
