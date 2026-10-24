import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

// Reuse the site's Markdown grammar, rather than interpreting blank lines or
// a '#' inside code, a quote, or a list as an editor boundary.
const parser = remark().use(remarkGfm).use(remarkMath);
type Node = ReturnType<typeof parser.parse>["children"][number];

function isMediaParagraph(node: Node) {
  if (node.type !== "paragraph") return false;
  if (node.children.every((child) => child.type === "image" || child.type === "imageReference"
    || (child.type === "text" && !child.value.trim())
    || (child.type === "link" && child.children.every((item) => item.type === "image")))) return true;
  if (node.children.some((child) => child.type === "html" && /^<\/?(?:video|iframe|audio|img|picture|figure)\b/i.test(child.value))
    && node.children.every((child) => child.type === "html" || (child.type === "text" && !child.value.trim()))) return true;
  if (node.children.length !== 1) return false;
  const child = node.children[0];
  const url = child.type === "link" ? child.url : child.type === "text" ? child.value : "";
  try {
    const parsed = new URL(url, "https://editor.local");
    const host = parsed.hostname.replace(/^www\./, "");
    return host === "youtube.com" || host === "m.youtube.com" || host === "youtu.be"
      || parsed.pathname.toLowerCase().endsWith(".mp4");
  } catch { return false; }
}

export function splitMarkdownSections(source: string): string[] {
  const sections: string[] = [];
  let start: number | null = null;
  let end = 0;
  const flush = () => {
    if (start !== null) sections.push(source.slice(start, end));
    start = null;
  };
  for (const node of parser.parse(source).children) {
    const nodeStart = node.position?.start.offset;
    const nodeEnd = node.position?.end.offset;
    if (nodeStart === undefined || nodeEnd === undefined) return [source];
    const isolated = ["code", "table", "math", "html"].includes(node.type) || isMediaParagraph(node);
    if (isolated || node.type === "heading" || node.type === "thematicBreak") flush();
    if (isolated) sections.push(source.slice(nodeStart, nodeEnd));
    else { start ??= nodeStart; end = nodeEnd; }
  }
  flush();
  return sections.length ? sections : [""];
}
