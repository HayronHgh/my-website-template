import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { MarkdownCopyButtons } from "@/components/blog/markdown-copy-buttons";
import { getPublishedProblem } from "@/lib/leetcode/public";
import { problemStatusLabels } from "@/lib/leetcode/schema";
type Props = { params: Promise<{ slug: string[] }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPublishedProblem((await params).slug.join("/"));
  return { title: post ? `${post.title} · LeetCode` : "LeetCode", description: post?.description,
    alternates: post ? { canonical: `/leetcode/${post.slug.split("/").map(encodeURIComponent).join("/")}` } : undefined };
}
export default async function ProblemPage({ params }: Props) {
  const post = await getPublishedProblem((await params).slug.join("/"));
  if (!post) notFound();
  return <Section><Container><article className="content-panel reading-panel">
    <Link href="/leetcode" className="content-back">← LeetCode 題庫</Link>
    <p className="content-caption">{post.problem!.entryType === "note" ? "LEETCODE / 學習筆記" : `LEETCODE / ${post.problem!.difficulty} / ${post.problem!.status ? problemStatusLabels[post.problem!.status] : "未註記"} / ${post.problem!.language}`}</p>
    <h1>{post.title}</h1><p className="content-summary">{post.description}</p>
    <p className="content-caption">{post.tags.join(" / ")} · {post.date}</p>
    <div className="prose-content" dangerouslySetInnerHTML={{ __html: post.html }} /><MarkdownCopyButtons />
  </article></Container></Section>;
}
