import type { Metadata } from "next";
import { ContentDomainSwitcher } from "@/components/content/content-domain-switcher";
import { ResearchGrid } from "@/components/research/research-grid";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { getPublishedResearchEntries } from "@/lib/research/public";
import { getSiteSettings } from "@/lib/site/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = {
  title: "Research",
  description: "研究問題、方法、實驗與可重現結果。",
  alternates: { canonical: "/research" },
};

export default async function ResearchPage() {
  const [entries, settings] = await Promise.all([getPublishedResearchEntries(), getSiteSettings()]);
  return (
    <Section className="!pt-0 sm:!pt-0">
      <PageHero
        accent="green"
        artClassName="page-hero-art-blog"
        background={settings.pageImages.blogHero.src}
        description="從問題定義、程式實作到實驗結果，將正在進行與已完成的研究整理成可閱讀、可重現的記錄。"
        icon="growth"
        imagePosition={settings.pageImages.blogHero.position}
        title="Research"
      />
      <Container className="mt-5 space-y-5">
        <ContentDomainSwitcher current="research" />
        <ResearchGrid entries={entries} />
      </Container>
    </Section>
  );
}
