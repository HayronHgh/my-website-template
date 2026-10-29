import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import type { JSONContent } from "@tiptap/core";

type Md = {
  type: string;
  value?: string;
  depth?: number;
  url?: string;
  title?: string;
  lang?: string;
  ordered?: boolean;
  align?: (string | null)[];
  start?: number;
  checked?: boolean | null;
  children?: Md[];
  position?: { start: { offset?: number }; end: { offset?: number } };
};
const parser = remark().use(remarkGfm).use(remarkMath);
const special = new Set([
  "image",
  "imageReference",
  "linkReference",
  "footnoteReference",
  "inlineMath",
  "html",
  "delete",
]);
function unsupported(n: Md): boolean {
  return (
    special.has(n.type) ||
    n.children?.some(unsupported) === true ||
    n.checked != null
  );
}
function inline(nodes: Md[] = []): JSONContent[] {
  return nodes.flatMap<JSONContent>((n) => {
    if (n.type === "text") return [{ type: "text", text: n.value ?? "" }];
    if (n.type === "break") return [{ type: "hardBreak" }];
    if (n.type === "inlineCode")
      return [{ type: "text", text: n.value ?? "", marks: [{ type: "code" }] }];
    const marks: Record<string, string> = {
      strong: "bold",
      emphasis: "italic",
      link: "link",
    };
    if (marks[n.type])
      return inline(n.children).map((c) => ({
        ...c,
        marks: [
          ...(c.marks ?? []),
          {
            type: marks[n.type],
            ...(n.type === "link"
              ? { attrs: { href: n.url, title: n.title ?? null } }
              : {}),
          },
        ],
      }));
    return [];
  });
}
function convert(n: Md, source: string): JSONContent {
  const raw = source.slice(
    n.position?.start.offset ?? 0,
    n.position?.end.offset ?? source.length,
  );
  if (
    unsupported(n) ||
    ["math", "definition", "footnoteDefinition", "yaml"].includes(n.type) ||
    (n.type === "code" && ["mermaid", "chart", "math"].includes(n.lang ?? ""))
  )
    return { type: "rawMarkdown", attrs: { raw } };
  switch (n.type) {
    case "paragraph": {
      const text =
        n.children?.map((c) => c.value ?? c.url ?? "").join("") ?? "";
      if (/(?:youtube\.com|youtu\.be|\.mp4(?:[?#]|$))/.test(text))
        return { type: "rawMarkdown", attrs: { raw } };
      return { type: "paragraph", content: inline(n.children) };
    }
    case "heading":
      return {
        type: "heading",
        attrs: { level: n.depth },
        content: inline(n.children),
      };
    case "blockquote":
      return {
        type: "blockquote",
        content: n.children?.map((c) => convert(c, source)),
      };
    case "list":
      return {
        type: n.ordered ? "orderedList" : "bulletList",
        attrs: n.ordered ? { start: n.start ?? 1 } : undefined,
        content: n.children?.map((c) => convert(c, source)),
      };
    case "listItem":
      return {
        type: "listItem",
        content: n.children?.map((c) => convert(c, source)),
      };
    case "code":
      return {
        type: "codeBlock",
        attrs: { language: n.lang ?? null },
        content: n.value ? [{ type: "text", text: n.value }] : [],
      };
    case "thematicBreak":
      return { type: "horizontalRule" };
    case "table":
      return {
        type: "table",
        attrs: { mdTableAlign: n.align ?? null },
        content: n.children?.map((row, i) => ({
          type: "tableRow",
          content: row.children?.map((cell) => ({
            type: i === 0 ? "tableHeader" : "tableCell",
            content: [{ type: "paragraph", content: inline(cell.children) }],
          })),
        })),
      };
    default:
      return { type: "rawMarkdown", attrs: { raw } };
  }
}
const trivia = new Set(["mdSource", "mdBaseline", "mdGap", "mdTail"]);
export function documentSignature(n: JSONContent): string {
  // Editor extensions add default attrs/marks; normalize them consistently.
  return JSON.stringify({
    type: n.type,
    text: n.text,
    marks: n.marks?.map((m) => ({
      type: m.type,
      attrs: m.attrs
        ? Object.fromEntries(
            Object.entries(m.attrs)
              .filter(([, v]) => v != null)
              .sort(([a], [b]) => a.localeCompare(b)),
          )
        : undefined,
    })),
    attrs: n.attrs
      ? Object.fromEntries(
          Object.entries(n.attrs)
            .filter(
              ([k, v]) =>
                !trivia.has(k) &&
                v != null &&
                v !== false &&
                !(Array.isArray(v) && v.length === 0),
            )
            .sort(([a], [b]) => a.localeCompare(b)),
        )
      : undefined,
    content: n.content?.map((c) => JSON.parse(documentSignature(c))),
  });
}
export function parseDocumentMarkdown(source: string): JSONContent {
  const tree = parser.parse(source);
  let end = 0;
  const content = tree.children.map((node) => {
    const n = node as Md;
    const start = n.position?.start.offset ?? 0;
    const finish = n.position?.end.offset ?? source.length;
    const converted = convert(n, source);
    converted.attrs = {
      ...converted.attrs,
      mdSource: source.slice(start, finish),
      mdGap: source.slice(end, start),
      mdTail: "",
    };
    end = finish;
    return converted;
  });
  if (content.length)
    content[content.length - 1].attrs!.mdTail = source.slice(end);
  return {
    type: "doc",
    content: content.length
      ? content
      : [
          {
            type: "paragraph",
            attrs: { mdSource: "", mdGap: source, mdTail: "" },
          },
        ],
  };
}
/** Capture schema-normalized nodes after setContent, so untouched text stays byte-for-byte. */
export function withDocumentBaselines(doc: JSONContent): JSONContent {
  return {
    ...doc,
    content: doc.content?.map((n) => ({
      ...n,
      attrs: { ...n.attrs, mdBaseline: documentSignature(n) },
    })),
  };
}
function escapeText(text: string) {
  return text.replace(/([\\`*_[\]<>])/g, "\\$1");
}
function text(n: JSONContent): string {
  if (n.type === "hardBreak") return "  \n";
  if (n.type === "text") {
    let value = n.marks?.some((m) => m.type === "code")
      ? (n.text ?? "")
      : escapeText(n.text ?? "");
    for (const m of n.marks ?? []) {
      if (m.type === "bold") value = `**${value}**`;
      if (m.type === "italic") value = `*${value}*`;
      if (m.type === "strike") value = `~~${value}~~`;
      if (m.type === "code") {
        const fence = value.includes("`") ? "``" : "`";
        value = `${fence}${value}${fence}`;
      }
      if (m.type === "link")
        value = `[${value}](${String(m.attrs?.href ?? "")}${m.attrs?.title ? ` "${String(m.attrs.title).replaceAll('"', '\\"')}"` : ""})`;
    }
    return value;
  }
  return n.content?.map(text).join("") ?? "";
}
function render(n: JSONContent): string {
  if (n.type === "rawMarkdown") return String(n.attrs?.raw ?? "");
  if (n.type === "paragraph") return text(n);
  if (n.type === "heading")
    return `${"#".repeat(Number(n.attrs?.level ?? 2))} ${text(n)}`;
  if (n.type === "horizontalRule") return "---";
  if (n.type === "blockquote")
    return (n.content?.map(render).join("\n\n") ?? "")
      .split("\n")
      .map((l) => `> ${l}`)
      .join("\n");
  if (n.type === "bulletList" || n.type === "orderedList")
    return (n.content ?? [])
      .map((item, i) => {
        const marker =
          n.type === "orderedList"
            ? `${Number(n.attrs?.start ?? 1) + i}. `
            : "- ";
        return (item.content?.map(render).join("\n\n") ?? "")
          .split("\n")
          .map((l, k) => (k ? " ".repeat(marker.length) + l : marker + l))
          .join("\n");
      })
      .join("\n");
  if (n.type === "codeBlock") {
    const body = n.content?.map((c) => c.text ?? "").join("") ?? "";
    const runs = body.match(/`+/g) ?? [];
    const fence = "`".repeat(Math.max(3, ...runs.map((r) => r.length + 1)));
    return `${fence}${n.attrs?.language ?? ""}\n${body}\n${fence}`;
  }
  if (n.type === "table") {
    const rows = (n.content ?? []).map((row) =>
      (row.content ?? []).map((cell) =>
        text(cell).replaceAll("|", "\\|").replaceAll("\n", "<br>"),
      ),
    );
    if (!rows.length) return "";
    return [
      rows[0],
      rows[0].map((_, i) =>
        n.attrs?.mdTableAlign?.[i] === "left"
          ? ":---"
          : n.attrs?.mdTableAlign?.[i] === "right"
            ? "---:"
            : n.attrs?.mdTableAlign?.[i] === "center"
              ? ":---:"
              : "---",
      ),
      ...rows.slice(1),
    ]
      .map((row) => `| ${row.join(" | ")} |`)
      .join("\n");
  }
  return n.content?.map(render).join("\n\n") ?? "";
}
export function serializeDocumentMarkdown(doc: JSONContent): string {
  return (doc.content ?? [])
    .map(
      (n, i) =>
        `${n.attrs?.mdGap || (i ? "\n\n" : "")}${n.attrs?.mdBaseline === documentSignature(n) ? String(n.attrs?.mdSource ?? "") : render(n)}${n.attrs?.mdTail ?? ""}`,
    )
    .join("");
}
