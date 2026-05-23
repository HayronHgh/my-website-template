import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import { getBlogAssetUrl } from "@/lib/blog/assets";

type MarkdownNode = {
  type?: unknown;
  url?: unknown;
  children?: unknown;
};

type MarkdownToHtmlOptions = {
  resolveAssetUrl?: (assetPath: string) => string;
  slug?: string;
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

const rewriteRelativeImageUrls = (resolveAssetUrl: (assetPath: string) => string) => () => (tree: unknown) => {
  visitMarkdownNodes(tree, (node) => {
    if (node.type === "image" && typeof node.url === "string") {
      node.url = resolveAssetUrl(node.url);
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
  }

  const processedContent = await processor
    .use(remarkRehype)
    .use(rehypeKatex)
    .use(rehypeStringify)
    .process(markdown);

  return processedContent.toString();
}
