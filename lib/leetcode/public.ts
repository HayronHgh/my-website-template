import { problemStore } from "@/lib/leetcode/store";
import { markdownToHtml } from "@/lib/blog/markdown";
import { ContentNotFoundError } from "@/lib/content/article-reader";

export async function getPublishedProblems() {
  return (await problemStore.list({ status: "published" })).sort((a, b) => (a.problem!.id ?? Infinity) - (b.problem!.id ?? Infinity));
}

export async function getPublishedProblem(slug: string) {
  try {
    const article = await problemStore.read(slug);
    if (!article.published) return null;
    return { ...article, html: await markdownToHtml(article.content) };
  } catch (error) {
    if (error instanceof ContentNotFoundError) return null;
    throw error;
  }
}
