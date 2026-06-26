import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import type { Options as RehypeSanitizeOptions } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import { codeToTokens, type BundledLanguage, type SpecialLanguage } from "shiki";
import { getVersionedBlogAssetUrl } from "@/lib/blog/assets";
import { sanitizeMarkdownUrl } from "@/lib/content/url-policy";

type MarkdownNode = {
  children?: unknown;
  data?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  tagName?: unknown;
  type?: unknown;
  url?: unknown;
  value?: unknown;
};

type MarkdownToHtmlOptions = {
  resolveAssetUrl?: (assetPath: string) => Promise<string> | string;
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
    button: [
      "ariaLabel",
      "dataCodeCopy",
      "type",
    ],
    div: [
      ...(defaultSchema.attributes?.div ?? []),
      "dataLanguage",
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
    span: [
      ...(defaultSchema.attributes?.span ?? []),
      "ariaHidden",
      "dataLine",
      ["style", /^color:\s*#[0-9a-fA-F]{6};?$/],
    ],
  },
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto", "tel"],
    src: ["http", "https"],
  },
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "annotation",
    "button",
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

const CODE_TITLE_PATTERN = /(?:^|\s)title=(?:"([^"]+)"|'([^']+)'|([^\s]+))/;
const CODE_HIGHLIGHT_PATTERN = /\{([\d,\-\s]+)\}/;

type CodeBlockMeta = {
  highlightLines: Set<number>;
  isDiff: boolean;
  title?: string;
};

type CodeToken = {
  color?: string;
  content: string;
};

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

function getClassNames(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }

  return typeof value === "string" ? value.split(/\s+/).filter(Boolean) : [];
}

function getCodeLanguage(codeNode: MarkdownNode) {
  const classNames = getClassNames(codeNode.properties?.className);
  const languageClass = classNames.find((className) => className.startsWith("language-"));

  return languageClass?.replace(/^language-/, "") || "text";
}

function getTextContent(node: MarkdownNode): string {
  if (node.type === "text") {
    return String(node.value ?? "");
  }

  if (!Array.isArray(node.children)) {
    return "";
  }

  return node.children
    .map((child) => getTextContent(child as MarkdownNode))
    .join("");
}

function parseHighlightLines(value: string) {
  const highlightLines = new Set<number>();

  value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .forEach((entry) => {
      const [startValue, endValue] = entry.split("-").map((part) => Number(part.trim()));

      if (!Number.isInteger(startValue) || startValue < 1) {
        return;
      }

      if (!Number.isInteger(endValue) || endValue < startValue) {
        highlightLines.add(startValue);
        return;
      }

      for (let line = startValue; line <= endValue; line += 1) {
        highlightLines.add(line);
      }
    });

  return highlightLines;
}

function parseCodeBlockMeta(meta: unknown, language: string): CodeBlockMeta {
  const metaValue = typeof meta === "string" ? meta : "";
  const titleMatch = CODE_TITLE_PATTERN.exec(metaValue);
  const highlightMatch = CODE_HIGHLIGHT_PATTERN.exec(metaValue);
  const title = titleMatch?.[1] ?? titleMatch?.[2] ?? titleMatch?.[3];

  return {
    highlightLines: highlightMatch ? parseHighlightLines(highlightMatch[1]) : new Set(),
    isDiff: language === "diff" || /\bdiff\b/i.test(metaValue),
    title,
  };
}

function getCodeElement(preNode: MarkdownNode) {
  if (!Array.isArray(preNode.children) || preNode.children.length !== 1) {
    return null;
  }

  const [codeNode] = preNode.children as MarkdownNode[];

  return codeNode.type === "element" && codeNode.tagName === "code" ? codeNode : null;
}

function getSafeHighlightLanguage(language: string) {
  const normalizedLanguage = language.trim().toLocaleLowerCase();

  if (normalizedLanguage === "text" || normalizedLanguage === "plain") {
    return "text";
  }

  return normalizedLanguage;
}

async function highlightCode(code: string, language: string): Promise<CodeToken[][]> {
  const lines = code.replace(/\n$/, "").split("\n");

  try {
    const highlighted = await codeToTokens(code.replace(/\n$/, ""), {
      lang: getSafeHighlightLanguage(language) as BundledLanguage | SpecialLanguage,
      theme: "github-dark",
    });

    return highlighted.tokens.map((line) =>
      line.map((token) => ({
        color: token.color,
        content: token.content,
      })),
    );
  } catch {
    return lines.map((line) => [{ content: line }]);
  }
}

function createTokenNodes(tokens: CodeToken[]) {
  if (tokens.length === 0) {
    return [{ type: "text", value: "" }];
  }

  return tokens.map((token) => {
    if (!token.color) {
      return {
        type: "text",
        value: token.content,
      };
    }

    return {
      children: [{ type: "text", value: token.content }],
      properties: {
        style: `color: ${token.color};`,
      },
      tagName: "span",
      type: "element",
    };
  });
}

async function createCodeLineNodes(code: string, meta: CodeBlockMeta, language: string) {
  const highlightedLines = await highlightCode(code, language);

  return highlightedLines.map((tokens, index) => {
    const lineNumber = index + 1;
    const line = tokens.map((token) => token.content).join("");
    const className = ["code-line"];

    if (meta.highlightLines.has(lineNumber)) {
      className.push("code-line-highlight");
    }

    if (meta.isDiff && line.startsWith("+") && !line.startsWith("+++")) {
      className.push("code-line-add");
    }

    if (meta.isDiff && line.startsWith("-") && !line.startsWith("---")) {
      className.push("code-line-remove");
    }

    return {
      children: [
        {
          children: [{ type: "text", value: String(lineNumber) }],
          properties: {
            ariaHidden: "true",
            className: ["code-line-number"],
          },
          tagName: "span",
          type: "element",
        },
        {
          children: createTokenNodes(tokens),
          properties: {
            className: ["code-line-content"],
          },
          tagName: "span",
          type: "element",
        },
      ],
      properties: {
        className,
        dataLine: String(lineNumber),
      },
      tagName: "span",
      type: "element",
    };
  });
}

const enhanceCodeBlocks = () => async (tree: unknown) => {
  await visitMarkdownNodesAsync(tree, async (node) => {
    if (node.type !== "element" || node.tagName !== "pre") {
      return;
    }

    if (getClassNames(node.properties?.className).includes("code-block-pre")) {
      return;
    }

    const codeNode = getCodeElement(node);

    if (!codeNode) {
      return;
    }

    const language = getCodeLanguage(codeNode);

    if (language === "math") {
      return;
    }

    const meta = parseCodeBlockMeta(codeNode.data?.meta, language);
    const code = getTextContent(codeNode);
    const headerChildren = [
      {
        children: [{ type: "text", value: meta.title ?? language }],
        properties: {
          className: ["code-block-title"],
        },
        tagName: "span",
        type: "element",
      },
      {
        children: [{ type: "text", value: language }],
        properties: {
          className: ["code-block-language"],
        },
        tagName: "span",
        type: "element",
      },
      {
        children: [{ type: "text", value: "Copy" }],
        properties: {
          ariaLabel: "Copy code",
          className: ["code-copy-button"],
          dataCodeCopy: "true",
          type: "button",
        },
        tagName: "button",
        type: "element",
      },
    ];

    node.tagName = "div";
    node.properties = {
      className: ["code-block"],
      dataLanguage: language,
    };
    node.children = [
      {
        children: headerChildren,
        properties: {
          className: ["code-block-header"],
        },
        tagName: "div",
        type: "element",
      },
      {
        children: [
          {
            children: await createCodeLineNodes(code, meta, language),
            properties: codeNode.properties,
            tagName: "code",
            type: "element",
          },
        ],
        properties: {
          className: ["code-block-pre"],
        },
        tagName: "pre",
        type: "element",
      },
    ];
  });
};

async function visitMarkdownNodesAsync(
  node: unknown,
  visitor: (node: MarkdownNode) => Promise<void> | void,
) {
  if (!node || typeof node !== "object") {
    return;
  }

  const markdownNode = node as MarkdownNode;
  await visitor(markdownNode);

  if (Array.isArray(markdownNode.children)) {
    for (const child of markdownNode.children) {
      await visitMarkdownNodesAsync(child, visitor);
    }
  }
}

const rewriteRelativeImageUrls = (
  resolveAssetUrl: (assetPath: string) => Promise<string> | string,
) => () => async (tree: unknown) => {
  await visitMarkdownNodesAsync(tree, async (node) => {
    if (node.type === "link" && typeof node.url === "string") {
      node.url = sanitizeMarkdownUrl(node.url, "link");
    }

    if (node.type === "image" && typeof node.url === "string") {
      const safeUrl = sanitizeMarkdownUrl(node.url, "image");
      node.url = safeUrl === "#" ? safeUrl : await resolveAssetUrl(safeUrl);
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
    processor.use(rewriteRelativeImageUrls((assetPath) =>
      getVersionedBlogAssetUrl(options.slug!, assetPath),
    ));
  } else {
    processor.use(sanitizeMarkdownUrls);
  }

  const processedContent = await processor
    .use(remarkRehype)
    .use(enhanceCodeBlocks)
    .use(rehypeSanitize, sanitizeSchema)
    .use(embedStandaloneYouTubeLinks)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(markdown);

  return processedContent.toString();
}
