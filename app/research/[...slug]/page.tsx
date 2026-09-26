import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { MarkdownCopyButtons } from "@/components/blog/markdown-copy-buttons";
import { ResearchExperimentPanel } from "@/components/research/research-experiment-panel";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getPublishedResearchEntry } from "@/lib/research/public";
import { researchStageLabels } from "@/lib/research/schema";

type Props = { params: Promise<{ slug: string[] }> };
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const entry = await getPublishedResearchEntry((await params).slug.join("/"));
  return { title: entry ? `${entry.title} · Research` : "Research", description: entry?.description };
}

export default async function ResearchEntryPage({ params }: Props) {
  const entry = await getPublishedResearchEntry((await params).slug.join("/"));
  if (!entry) notFound();
  return <Section><Container className="research-reading-layout">
    <article className="content-panel reading-panel">
      <Link className="research-back" href="/research" aria-label="返回 Research">
        <ArrowLeft size={16} strokeWidth={1.75} aria-hidden="true" /><span>Research</span>
      </Link>
      <p className="content-caption">{entry.research?.area ?? "RESEARCH"} / {entry.research ? researchStageLabels[entry.research.stage] : "研究筆記"}</p>
      <h1>{entry.title}</h1><p className="content-summary">{entry.description}</p>
      <p className="content-caption">{entry.tags.join(" / ")} · {entry.date}</p>
      <div className="prose-content" dangerouslySetInnerHTML={{ __html: entry.html }} /><MarkdownCopyButtons />
    </article>
    {entry.experiment ? <ResearchExperimentPanel config={entry.experiment} runnerEnabled={process.env.RESEARCH_RUNNER_ENABLED === "true"} slug={entry.slug} /> : null}
  </Container></Section>;
}
