import type { Metadata } from "next";
import { ProjectCard } from "@/components/projects/project-card";
import { Container } from "@/components/ui/container";
import { NeonButton } from "@/components/ui/neon-button";
import { PageHero } from "@/components/ui/page-hero";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { ui } from "@/components/ui/pixel-theme";
import { Section } from "@/components/ui/section";
import type { ProjectGroup } from "@/data/site";
import { getPublishedProjects } from "@/lib/projects/meta";
import { getSiteSettings } from "@/lib/site/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Projects",
  description: "Selected case studies, system builds, and experiments from file-based project content.",
};

const projectGroupLabels: Record<ProjectGroup, string> = {
  featured: "Featured Projects",
  systems: "Systems Projects",
  experiments: "Experiments / Side Projects",
};

const projectGroupDescriptions: Record<ProjectGroup, string> = {
  featured: "Landed private cases presented as anonymized engineering case studies.",
  systems: "System-oriented builds that show AI, storage, and integration depth.",
  experiments: "Game, algorithm, simulation, and security-learning side work.",
};

export default async function ProjectsPage() {
  const [projectItems, siteSettings] = await Promise.all([
    getPublishedProjects(),
    getSiteSettings(),
  ]);
  const techCount = new Set(projectItems.flatMap((project) => project.tech)).size;
  const featuredCount = projectItems.filter((project) => project.group === "featured").length;
  const systemCount = projectItems.filter((project) => project.group === "systems").length;
  const groupedProjects = (["featured", "systems", "experiments"] as ProjectGroup[]).map(
    (group) => ({
      description: projectGroupDescriptions[group],
      group,
      projects: projectItems.filter((project) => project.group === group),
      title: projectGroupLabels[group],
    }),
  );

  return (
    <Section className="pt-0! sm:pt-0!">
      <PageHero
        accent="cyan"
        artClassName="page-hero-art-projects"
        background={siteSettings.pageImages.projectsHero.src}
        contentClassName="!items-end !pb-12 !pt-24 sm:!pb-14 sm:!pt-28 lg:!pb-16"
        description="Anonymized case studies, system builds, and experiments presented as pixel-night engineering cartridges."
        icon="projects"
        imagePosition={siteSettings.pageImages.projectsHero.position}
        title="Projects"
      >
        <div className="grid max-w-152 grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Projects", value: `${projectItems.length}+` },
            { label: "Case Studies", value: featuredCount },
            { label: "Systems", value: systemCount },
            { label: "Tech Tags", value: techCount },
          ].map((stat) => (
            <div
              className="rounded-[5px] border border-[#26344d] bg-[#101827] px-4 py-3 shadow-[inset_0_0_0_1px_#172238]"
              key={stat.label}
            >
              <p className="font-mono text-2xl font-black text-[#8ed2d8]">{stat.value}</p>
              <p className="mt-1 font-mono text-[11px] text-[#9fb0d8]">{stat.label}</p>
            </div>
          ))}
        </div>
      </PageHero>

      <Container className="mt-5 space-y-5">
        {groupedProjects.map(({ description, group, projects, title }) => (
          <PixelCard
            accent={group === "featured" ? "cyan" : group === "systems" ? "blue" : "purple"}
            className="space-y-4 p-3!"
            key={group}
          >
            <div className="flex flex-col justify-between gap-2 px-1 sm:flex-row sm:items-end">
              <div className="flex items-start gap-2">
                <PixelIcon
                  className="mt-0.5 h-4 w-4"
                  name={group === "featured" ? "star" : "projects"}
                />
                <div>
                  <h2 className="font-mono text-lg font-black text-[#8ed2d8]">
                    {title}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-[#9fb0d8]">{description}</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard compact key={project.slug} project={project} showLinks />
              ))}
            </div>
          </PixelCard>
        ))}

        <PixelCard accent="blue" className="space-y-3" id="project-archive">
          <div className="flex items-center gap-2">
            <PixelIcon className="h-4 w-4" name="projects" />
            <h2 className="font-mono text-lg font-black text-white">Project Index</h2>
          </div>
          <div className="divide-y divide-cyan-300/10">
            {projectItems.map((project) => (
              <article
                className="grid gap-3 py-3 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto] sm:items-center"
                key={`index-${project.slug}`}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-mono text-base font-black text-[#eef3ff]">
                      {project.title}
                    </h3>
                    {project.year ? (
                      <span className={ui.tinyTag}>
                        {project.year}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 text-sm leading-6 text-[#9fb0d8]">{project.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 sm:justify-end">
                  <NeonButton
                    accent={project.accent}
                    href={project.detailsUrl}
                    size="md"
                    variant="ghost"
                  >
                    <PixelIcon className="h-4 w-4" name="projects" />
                    Details
                  </NeonButton>
                  {project.caseStudyUrl ? (
                    <NeonButton
                      accent="purple"
                      href={project.caseStudyUrl}
                      size="md"
                      variant="ghost"
                    >
                      <PixelIcon className="h-4 w-4" name="file" />
                      Case Study
                    </NeonButton>
                  ) : null}
                  {project.repoUrl ? (
                    <NeonButton
                      accent="purple"
                      external
                      href={project.repoUrl}
                      size="md"
                      variant="ghost"
                    >
                      <PixelIcon className="h-4 w-4" name="github" />
                      GitHub
                    </NeonButton>
                  ) : null}
                  {project.demoUrl ? (
                    <NeonButton
                      accent="amber"
                      external
                      href={project.demoUrl}
                      size="md"
                      variant="ghost"
                    >
                      <PixelIcon className="h-4 w-4" name="projects" />
                      Live Demo
                    </NeonButton>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </PixelCard>
      </Container>
    </Section>
  );
}
