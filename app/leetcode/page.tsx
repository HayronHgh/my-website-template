import type { Metadata } from "next";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PageHero } from "@/components/ui/page-hero";
import { ProblemList } from "@/components/leetcode/problem-list";
import { getPublishedProblems } from "@/lib/leetcode/public";
import { getSiteSettings } from "@/lib/site/settings";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "LeetCode", description: "依題號、難度與進度整理的解題紀錄。從直覺到正確性與複雜度分析。", alternates: { canonical: "/leetcode" } };
export default async function LeetCodePage() {
  const [problems, site] = await Promise.all([getPublishedProblems(), getSiteSettings()]);
  return <Section className="!pt-0 sm:!pt-0"><PageHero accent="green" artClassName="page-hero-art-blog" background={site.pageImages.blogHero.src} imagePosition={site.pageImages.blogHero.position} icon="skills" title="LeetCode" description="從直覺到解法。演算法練習、複雜度分析與複習紀錄。" />
    <Container className="mt-5"><ProblemList problems={problems.map((p) => ({ ...p.problem!, slug: p.slug, title: p.title, tags: p.tags, summary: p.description }))} /></Container>
  </Section>;
}
