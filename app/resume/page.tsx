import type { Metadata } from "next";
import { ProjectCard } from "@/components/projects/project-card";
import { NeonButton } from "@/components/ui/neon-button";
import { PageHero } from "@/components/ui/page-hero";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { ui } from "@/components/ui/pixel-theme";
import { SkillCard } from "@/components/ui/skill-card";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getPublishedProjects } from "@/lib/projects/meta";
import { getSiteSettings } from "@/lib/site/settings";
import type { SiteSettings } from "@/lib/site/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getSiteSettings();

  return {
    title: pages.resume.metadata.title,
    description: pages.resume.metadata.description,
  };
}

function resolveProfileToken(value: string, siteProfile: SiteSettings["siteProfile"]) {
  const tokens: Record<string, string> = {
    "{{email}}": siteProfile.email,
    "{{location}}": siteProfile.location,
    "{{status}}": siteProfile.status,
    "{{timezone}}": siteProfile.timezone,
  };

  return tokens[value] ?? value;
}

export default async function ResumePage() {
  const [projects, siteSettings] = await Promise.all([
    getPublishedProjects(),
    getSiteSettings(),
  ]);
  const {
    pageImages,
    resumeExperience,
    resumeSections,
    resumeSummary,
    siteProfile,
    skillItems,
  } = siteSettings;
  const pageCopy = siteSettings.pages.resume;
  const resumeProjectHighlights = projects.filter((project) => project.group === "featured");

  return (
    <Section className="!pt-0 sm:!pt-0">
      <PageHero
        accent="amber"
        artClassName="page-hero-art-resume"
        background={pageImages.resumeHero.src}
        description={resumeSummary}
        icon="resume"
        imagePosition={pageImages.resumeHero.position}
        title={pageCopy.heroTitle}
      >
        <div className="flex flex-wrap gap-3">
          <NeonButton
            accent="amber"
            className="border-amber-300/70 bg-[#241705] text-amber-100 hover:border-amber-200 hover:bg-[#322006]"
            href={pageCopy.actions.download.href || siteProfile.resumeDownloadUrl}
            size="md"
            variant="primary"
            download
          >
            <PixelIcon className="h-4 w-4" name="resume" />
            {pageCopy.actions.download.label}
          </NeonButton>
          <NeonButton
            accent="purple"
            href={pageCopy.actions.contact.href}
            size="md"
            variant="secondary"
          >
            <PixelIcon className="h-4 w-4" name="contact" />
            {pageCopy.actions.contact.label}
          </NeonButton>
        </div>
      </PageHero>

      <Container className="mt-5 space-y-5">
        <PixelCard
          accent="cyan"
          className="grid gap-4 p-4! sm:grid-cols-2 lg:grid-cols-4"
        >
          {pageCopy.stats.map((item) => (
            <div className="flex items-center gap-3" key={item.label}>
              <PixelIcon className="h-5 w-5" name={item.icon} />
              <div className="min-w-0">
                <p className="truncate font-mono text-base font-black text-[#8ed2d8]">
                  {resolveProfileToken(item.value, siteProfile)}
                </p>
                <p className="mt-0.5 font-mono text-[11px] text-[#8fa0bf]">{item.label}</p>
              </div>
            </div>
          ))}
        </PixelCard>

        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <PixelCard accent="purple" className="space-y-5">
            <div className="flex items-center gap-2">
              <PixelIcon className="h-5 w-5" name="journey" />
              <h2 className="font-mono text-xl font-black text-white">
                {pageCopy.experienceTitle}
              </h2>
            </div>
            <div className="space-y-5">
              {resumeExperience.map((item) => (
                <article
                  className="rounded-[6px] border border-[#26344d] bg-[#101827] p-4 shadow-[inset_0_0_0_1px_#172238]"
                  key={`${item.period}-${item.title}`}
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <h3 className="font-mono text-lg font-bold leading-7 text-white">
                        {item.title}
                      </h3>
                      <p className="mt-1 text-sm text-[#9fb0d8]">
                        {pageCopy.experienceScopeLabel}: {item.organization}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-sm text-violet-200">{item.period}</p>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#b7c2e0]">{item.description}</p>
                  <ul className="mt-4 grid gap-2">
                    {item.highlights.map((highlight) => (
                      <li className="text-sm leading-6 text-[#b7c2e0]" key={highlight}>
                        <span aria-hidden className="font-mono text-cyan-200">
                          {">"}
                        </span>{" "}
                        {highlight}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(item.tech ?? resumeSections[0].items).map((tag) => (
                      <span
                        className={ui.tinyTag}
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          </PixelCard>

          <div className="grid gap-5">
            <PixelCard accent="green" className="flex max-h-[32rem] min-h-0 flex-col space-y-4">
              <div className="flex items-center gap-2 text-lime-200">
                <PixelIcon className="h-5 w-5" name="skills" />
                <h2 className="font-mono text-xl font-black text-white">{pageCopy.skillsTitle}</h2>
              </div>
              <div className="pixel-scrollbar grid min-h-0 gap-3 overflow-y-auto pr-1.5">
                {skillItems.map((skill) => (
                  <SkillCard compact key={skill.name} skill={skill} />
                ))}
              </div>
            </PixelCard>

            {resumeSections.map((section) => (
              <PixelCard accent="cyan" className="min-h-28 space-y-4" key={section.title}>
                <h2 className="font-mono text-lg font-black text-white">{section.title}</h2>
                <div className="flex flex-wrap gap-2">
                  {section.items.map((item) => (
                    <span
                      className={ui.tinyTag}
                      key={item}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </PixelCard>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="flex items-center gap-2 text-amber-200">
            <PixelIcon className="h-5 w-5" name="projects" />
            <h2 className="font-mono text-2xl font-bold text-white">
              {pageCopy.projectHighlightsTitle}
            </h2>
          </div>
          <div className="grid gap-5 lg:grid-cols-3">
            {resumeProjectHighlights.map((project) => (
              <ProjectCard
                compact
                key={project.slug}
                labels={siteSettings.pages.projectCard}
                project={project}
              />
            ))}
          </div>
        </div>
      </Container>
    </Section>
  );
}
