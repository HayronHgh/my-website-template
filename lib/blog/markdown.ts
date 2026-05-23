import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Options as RehypeSanitizeOptions } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import { getBlogAssetUrl } from "@/lib/blog/assets";
import { sanitizeMarkdownUrl } from "@/lib/content/url-policy";

type MarkdownNode = {
  type?: unknown;
  url?: unknown;
  children?: unknown;
};

type MarkdownToHtmlOptions = {
  resolveAssetUrl?: (assetPath: string) => string;
  slug?: string;
};

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    "*": [
      ...(defaultSchema.attributes?.["*"] ?? []),
      ["className", /^[A-Za-z0-9_\-\s]+$/],
    ],
    a: [
      ...(defaultSchema.attributes?.a ?? []),
      "href",
      "title",
    ],
    annotation: ["encoding"],
    img: [
      ...(defaultSchema.attributes?.img ?? []),
      "alt",
      "src",
      "title",
    ],
    math: ["display", "xmlns"],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto", "tel"],
    src: ["http", "https"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "annotation",
    "math",
    "mfrac",
    "mi",
    "mn",
    "mo",
    "mrow",
    "msqrt",
    "mstyle",
    "msub",
    "msubsup",
    "msup",
    "mtable",
    "mtd",
    "mtext",
    "mtr",
    "semantics",
  ],
} as RehypeSanitizeOptions;

function visitMarkdownNodes(node: unknown, visitor: (node: MarkdownNode) => void) {
  if (!node || typeof node !== "object") {
    return;
  }

  const markdownNode = node as MarkdownNode;
  visitor(markdownNode);

  if (Array.isArray(markdownNode.children)) {
    markdownNode.children.forEach((child) => visitMarkdownNodes(child, visitor));
  }
}

const rewriteRelativeImageUrls = (resolveAssetUrl: (assetPath: string) => string) => () => (tree: unknown) => {
  visitMarkdownNodes(tree, (node) => {
    if (node.type === "link" && typeof node.url === "string") {
      node.url = sanitizeMarkdownUrl(node.url, "link");
    }

    if (node.type === "image" && typeof node.url === "string") {
      const safeUrl = sanitizeMarkdownUrl(node.url, "image");
      node.url = safeUrl === "#" ? safeUrl : resolveAssetUrl(safeUrl);
    }
  });
};

const sanitizeMarkdownUrls = () => (tree: unknown) => {
  visitMarkdownNodes(tree, (node) => {
    if (node.type === "link" && typeof node.url === "string") {
      node.url = sanitizeMarkdownUrl(node.url, "link");
    }

    if (node.type === "image" && typeof node.url === "string") {
      node.url = sanitizeMarkdownUrl(node.url, "image");
    }
  });
};

export async function markdownToHtml(
  markdown: string,
  options: MarkdownToHtmlOptions = {},
) {
  const processor = remark().use(remarkGfm).use(remarkMath);

  if (options.resolveAssetUrl) {
    processor.use(rewriteRelativeImageUrls(options.resolveAssetUrl));
  } else if (options.slug) {
    processor.use(rewriteRelativeImageUrls((assetPath) => getBlogAssetUrl(options.slug!, assetPath)));
  } else {
    processor.use(sanitizeMarkdownUrls);
  }

  const processedContent = await processor
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeSanitize, sanitizeSchema)
    .use(rehypeStringify)
    .process(markdown);

  return processedContent.toString();
}
