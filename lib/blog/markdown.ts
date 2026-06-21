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
  children?: unknown;
  properties?: Record<string, unknown>;
  tagName?: unknown;
  type?: unknown;
  url?: unknown;
  value?: unknown;
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
    iframe: [
      "allow",
      "allowFullScreen",
      "loading",
      "referrerPolicy",
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
    "iframe",
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

function getYouTubeEmbedUrl(value: string) {
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLocaleLowerCase().replace(/^www\./, "");
    let videoId: string | null = null;

    if (hostname === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] ?? null;
    }

    if (hostname === "youtube.com" || hostname === "m.youtube.com") {
      if (url.pathname === "/watch") {
        videoId = url.searchParams.get("v");
      } else {
        const [kind, id] = url.pathname.split("/").filter(Boolean);

        if (kind === "shorts" || kind === "embed") {
          videoId = id ?? null;
        }
      }
    }

    if (!videoId || !/^[A-Za-z0-9_-]{6,}$/.test(videoId)) {
      return null;
    }

    return `https://www.youtube-nocookie.com/embed/${videoId}`;
  } catch {
    return null;
  }
}

function getSingleLinkUrl(node: MarkdownNode) {
  if (!Array.isArray(node.children)) {
    return null;
  }

  const meaningfulChildren = node.children.filter((child) => {
    const childNode = child as MarkdownNode;
    return childNode.type !== "text" || String(childNode.value ?? "").trim().length > 0;
  }) as MarkdownNode[];

  if (meaningfulChildren.length !== 1) {
    return null;
  }

  const [child] = meaningfulChildren;

  if (child.type !== "element" || child.tagName !== "a") {
    return null;
  }

  const href = child.properties?.href;

  if (typeof href !== "string") {
    return null;
  }

  const linkText = Array.isArray(child.children)
    ? child.children
        .map((grandchild) => String((grandchild as MarkdownNode).value ?? ""))
        .join("")
        .trim()
    : "";

  return linkText === href ? href : null;
}

const embedStandaloneYouTubeLinks = () => (tree: unknown) => {
  visitMarkdownNodes(tree, (node) => {
    if (node.type !== "element" || node.tagName !== "p") {
      return;
    }

    const linkUrl = getSingleLinkUrl(node);
    const embedUrl = linkUrl ? getYouTubeEmbedUrl(linkUrl) : null;

    if (!embedUrl) {
      return;
    }

    node.tagName = "div";
    node.properties = {
      className: ["youtube-embed"],
    };
    node.children = [
      {
        children: [],
        properties: {
          allow:
            "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowFullScreen: true,
          loading: "lazy",
          referrerPolicy: "strict-origin-when-cross-origin",
          src: embedUrl,
          title: "YouTube video",
        },
        tagName: "iframe",
        type: "element",
      },
    ];
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
    .use(rehypeSanitize, sanitizeSchema)
    .use(embedStandaloneYouTubeLinks)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(markdown);

  return processedContent.toString();
}
