import { BackControl } from "@/components/ui/back-control";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { MarkdownCopyButtons } from "@/components/blog/markdown-copy-buttons";
import { getPublishedProblem } from "@/lib/leetcode/public";
import { cleanProblemTitle, formatProblemUpdatedAt } from "@/lib/leetcode/notebook";
type Props = { params: Promise<{ slug: string[] }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedProblem((await params).slug.join("/"));
  return { title: post ? `${cleanProblemTitle(post.title, post.problem?.id)} · LeetCode` : "LeetCode", description: post?.description,
    alternates: post ? { canonical: `/leetcode/${post.slug.split("/").map(encodeURIComponent).join("/")}` } : undefined };
}
export default async function ProblemPage({ params }: Props) {
  const post = await getPublishedProblem((await params).slug.join("/"));
  if (!post) notFound();
  return <Section><Container><article className="content-panel reading-panel">
    <BackControl href="/leetcode" />
    <p className="content-caption">{post.problem!.entryType === "note" ? "LeetCode / 學習筆記" : ["LeetCode", post.problem!.difficulty, post.problem!.language].filter(Boolean).join(" / ")}</p>
    <h1>{post.problem?.id ? <span className="mr-3 text-slate-400">#{post.problem.id}</span> : null}{cleanProblemTitle(post.title, post.problem?.id)}</h1><p className="content-summary">{post.description}</p>
    <p className="content-caption">{post.tags.length ? `${post.tags.join(" / ")} · ` : ""}<time dateTime={post.updatedAt}>更新 {formatProblemUpdatedAt(post.updatedAt)}</time></p>
    <div className="prose-content" dangerouslySetInnerHTML={{ __html: post.html }} /><MarkdownCopyButtons />
  </article></Container></Section>;
}
