import type { Metadata } from "next";
import { ContentDomainSwitcher } from "@/components/content/content-domain-switcher";
import { ProblemList } from "@/components/leetcode/problem-list";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { getPublishedProblems } from "@/lib/leetcode/public";
import { getSiteSettings } from "@/lib/site/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "Algorithm Practice",
  description: "LeetCode 題解、複雜度分析與複習進度。",
  alternates: { canonical: "/leetcode" },
};

export default async function LeetCodePage() {
  const [problems, settings] = await Promise.all([getPublishedProblems(), getSiteSettings()]);
  return (
    <Section className="!pt-0 sm:!pt-0">
      <PageHero
        accent="amber"
        artClassName="page-hero-art-blog"
        background={settings.pageImages.blogHero.src}
        description="把解題過程留下來：問題拆解、正確性、時間複雜度，以及值得回頭複習的觀察。"
        icon="skills"
        imagePosition={settings.pageImages.blogHero.position}
        title="Algorithm Practice"
      />
      <Container className="mt-5 space-y-5">
        <ContentDomainSwitcher current="leetcode" />
        <ProblemList problems={problems.map((problem) => ({
          ...problem.problem!,
          slug: problem.slug,
          summary: problem.description,
          tags: problem.tags,
          title: problem.title,
        }))} />
      </Container>
    </Section>
  );
}
