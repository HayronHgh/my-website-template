import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";

export type OutlineEntry = { id: string; depth: number; title: string };
type Tree = {
  type?: string;
  tagName?: string;
  value?: string;
  children?: Tree[];
  properties?: Record<string, unknown>;
};
export function nodeText(node: Tree): string {
  return node.value ?? node.children?.map(nodeText).join("") ?? "";
}
export function headingIds() {
  const seen = new Map<string, number>();
  return (title: string) => {
    const base =
      title
        .toLowerCase()
        .trim()
        .replace(/[^\p{L}\p{N}\s_-]/gu, "")
        .replace(/\s+/g, "-") || "section";
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return `section-${base}${count ? `-${count + 1}` : ""}`;
  };
}
export function getMarkdownOutline(source: string): OutlineEntry[] {
  const tree = remark().use(remarkGfm).use(remarkMath).parse(source);
  const id = headingIds();
  return tree.children
    .filter((n) => n.type === "heading")
    .map((n) => ({
      id: id(nodeText(n as Tree)),
      depth: (n as { depth: number }).depth,
      title: nodeText(n as Tree),
    }));
}
export function headingAnchors() {
  return (tree: Tree) => {
    const id = headingIds();
    const walk = (node: Tree) => {
      if (/^h[1-6]$/.test(node.tagName ?? ""))
        node.properties = {
          ...node.properties,
          id: node.properties?.id || id(nodeText(node)),
        };
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}
