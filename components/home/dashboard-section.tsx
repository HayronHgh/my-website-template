import Link from "next/link";
import { FocusPanel } from "@/components/home/focus-panel";
import { BlogCard } from "@/components/blog/blog-card";
import { ProjectCard } from "@/components/projects/project-card";
import { Container } from "@/components/ui/container";
import { PixelCard } from "@/components/ui/pixel-card";
import { Timeline } from "@/components/ui/timeline";
import type { ProjectItem } from "@/data/site";
import type { SiteSettings } from "@/lib/site/settings";

type PracticeStats = {
  notes: number;
  published: number;
  solved: number;
};

type DashboardSectionProps = {
  copy: SiteSettings["pages"]["home"]["dashboard"];
  homePageData: SiteSettings["homePageData"];
  practiceStats: PracticeStats;
  projectCardLabels: SiteSettings["pages"]["projectCard"];
  projects: ProjectItem[];
  timelineCopy: SiteSettings["pages"]["home"]["timeline"];
};

const sectionLinkClassName =
  "font-mono text-xs font-semibold text-cyan-200/75 transition hover:text-cyan-100";

export function DashboardSection({
  copy,
  homePageData,
  practiceStats,
  projectCardLabels,
  projects,
  timelineCopy,
}: DashboardSectionProps) {
  const strengths = homePageData.skills.slice(0, 3);

  return (
    <section className="relative overflow-hidden bg-[#050714] pb-14 pt-5 after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_top,#11182b,transparent_42%)] sm:pb-16">
      <Container className="relative z-10">
        <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.72fr)]">
          <PixelCard
            accent="cyan"
            as="section"
            className="about-panel min-h-45 border-[#2d5364] bg-[#0b1220] p-4! lg:min-h-[202px]"
          >
            <p className="pixel-section-kicker">
              <span className="pixel-section-icon pixel-section-icon-about" aria-hidden />
              {copy.aboutTitle}
            </p>

            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {strengths.map((strength) => (
                <article
                  className="flex min-h-[116px] min-w-0 flex-col rounded-[4px] border border-[#263f55] bg-[#0e1727] p-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]"
                  key={strength.name}
                >
                  <div className="flex min-w-0 items-start justify-between gap-2">
                    <h3 className="font-mono text-xs font-black leading-5 text-[#eef6ff]">
                      {strength.name}
                    </h3>
                  </div>
                  <p className="clamp-2 mt-1 text-[11px] leading-4 text-[#9fb0c9]">
                    {strength.subtitle || strength.note}
                  </p>
                  <div className="mt-auto flex min-w-0 gap-1.5 pt-2">
                    {(strength.evidence ?? []).slice(0, 2).map((item) => (
                      <span
                        className="max-w-[48%] truncate rounded-[3px] border border-[#315467] bg-[#111c2f] px-1.5 py-1 font-mono text-[9px] font-bold leading-none text-[#b9dfe3]"
                        key={item}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </PixelCard>

          <Timeline
            compact
            items={homePageData.timeline}
            link={timelineCopy.link}
            title={timelineCopy.title}
          />

          <PixelCard
            accent="amber"
            as="section"
            className="flex flex-col gap-3 p-3! lg:min-h-[430px] [&_.project-preview-compact]:lg:h-[180px] [&_.project-preview-compact]:lg:aspect-auto"
          >
            <div className="flex items-center justify-between gap-4">
              <p className="pixel-section-kicker">
                <span className="pixel-section-icon pixel-section-icon-star" aria-hidden />
                {copy.featuredProjectsTitle}
              </p>
              <Link className={sectionLinkClassName} href={copy.featuredProjectsLink.href}>
                {copy.featuredProjectsLink.label}
              </Link>
            </div>

            <div className="grid flex-1 gap-4 md:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard
                  compact
                  key={project.slug}
                  labels={projectCardLabels}
                  project={project}
                />
              ))}
            </div>
          </PixelCard>

          <div className="focus-slot"><FocusPanel data={homePageData.focus} /></div>

          <PixelCard accent="purple" as="section" className="space-y-3 p-3!">
            <div className="flex items-center justify-between gap-4">
              <p className="pixel-section-kicker">
                <span className="pixel-section-icon pixel-section-icon-blog" aria-hidden />
                {copy.blogTitle}
              </p>
              <Link className={sectionLinkClassName} href={copy.blogLink.href}>
                {copy.blogLink.label}
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {homePageData.articles.map((post) => (
                <BlogCard compact key={post.slug} post={post} readLabel="Read" />
              ))}
            </div>
          </PixelCard>

          <PixelCard accent="amber" as="section" className="flex h-full flex-col">
            <p className="pixel-section-kicker text-amber-100">
              <span className="pixel-section-icon pixel-section-icon-skills" aria-hidden />
              Algorithm Practice
            </p>
            <p className="mt-3 text-sm leading-6 text-[#b7c2d8]">
              記錄解題思路、複雜度分析與複習筆記。
            </p>

            <dl className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["Published", practiceStats.published],
                ["Solved", practiceStats.solved],
                ["Notes", practiceStats.notes],
              ].map(([label, value]) => (
                <div
                  className="flex flex-col rounded-[4px] border border-amber-200/15 bg-[#101827] px-2 py-3 text-center"
                  key={label}
                >
                  <dt className="order-2 mt-1 font-mono text-[9px] uppercase tracking-wide text-[#9fb0d8]">
                    {label}
                  </dt>
                  <dd className="order-1 font-mono text-lg font-black text-amber-100">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <Link
              className={`${sectionLinkClassName} mt-auto block w-fit self-end pt-4`}
              href="/leetcode"
            >
              Browse practice notes -&gt;
            </Link>
          </PixelCard>
        </div>
      </Container>
    </section>
  );
}
