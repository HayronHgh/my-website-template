import Link from "next/link";
import { BlogCard } from "@/components/blog/blog-card";
import { ProjectCard } from "@/components/projects/project-card";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { Timeline } from "@/components/ui/timeline";
import { Container } from "@/components/ui/container";
import type { ProjectItem } from "@/data/site";
import type { SiteSettings } from "@/lib/site/settings";

type DashboardSectionProps = {
  blogCardReadLabel: string;
  contactLinks: SiteSettings["contactLinks"];
  copy: SiteSettings["pages"]["home"]["dashboard"];
  homePageData: SiteSettings["homePageData"];
  projectCardLabels: SiteSettings["pages"]["projectCard"];
  projects: ProjectItem[];
  siteProfile: SiteSettings["siteProfile"];
  timelineCopy: SiteSettings["pages"]["home"]["timeline"];
};

export function DashboardSection({
  blogCardReadLabel,
  contactLinks,
  copy,
  homePageData,
  projectCardLabels,
  projects,
  siteProfile,
  timelineCopy,
}: DashboardSectionProps) {
  const profileFacts = [
    {
      icon: "location",
      label: copy.profileFactLabels.location,
      value: homePageData.profileMeta.location,
    },
    {
      icon: "mail",
      label: copy.profileFactLabels.email,
      value: homePageData.profileMeta.email,
    },
    {
      icon: "clock",
      label: copy.profileFactLabels.timezone,
      value: homePageData.profileMeta.timezone,
    },
    {
      icon: "heart",
      label: copy.profileFactLabels.status,
      value: homePageData.profileMeta.status,
      status: true,
    },
  ];

  return (
    <section className="relative overflow-hidden bg-[#050714] pb-14 pt-5 after:pointer-events-none after:absolute after:inset-0 after:bg-[radial-gradient(circle_at_top,#11182b,transparent_42%)] sm:pb-16">
      <Container className="relative z-10 space-y-5">
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.62fr)_minmax(340px,0.72fr)]">
          <div className="space-y-5">
            <PixelCard
              accent="cyan"
              as="section"
              className="about-panel grid min-h-45 items-center gap-x-4 gap-y-2 border-[#2d5364] bg-[#0b1220] p-4! md:grid-cols-[140px_1fr] lg:h-[202px] lg:grid-cols-[140px_1fr]"
            >
              <p className="pixel-section-kicker md:col-span-2">
                <span className="pixel-section-icon pixel-section-icon-about" aria-hidden />
                {copy.aboutTitle}
              </p>

              <div
                aria-label="Pixel style engineer avatar"
                className="home-about-avatar"
                role="img"
              >
                <div className="avatar-screen" />
                <div className="avatar-head" />
                <div className="avatar-body" />
                <div className="avatar-laptop" />
              </div>

              <div className="min-w-0 space-y-3">
                <p className="max-w-[58ch] text-sm leading-6 text-[#b7c2d8]">
                  {siteProfile.intro}
                </p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                  {profileFacts.slice(0, 3).map((fact) => (
                    <div
                      className="inline-flex min-w-0 items-center gap-2 font-mono text-xs text-[#c9d2e6]"
                      key={fact.label}
                    >
                      <span
                        aria-hidden
                        className={`pixel-meta-icon pixel-meta-icon-${fact.icon}`}
                      />
                      <span className="truncate">{fact.value}</span>
                    </div>
                  ))}
                  <div className="inline-flex min-w-0 items-center gap-2 font-mono text-xs font-bold text-lime-200/90">
                    <span
                      aria-hidden
                      className="pixel-meta-icon pixel-meta-icon-heart"
                    />
                    <span className="truncate">{homePageData.profileMeta.status}</span>
                  </div>
                </div>
              </div>
            </PixelCard>

            <PixelCard
              accent="amber"
              as="section"
              className="flex flex-col gap-3 p-3! lg:h-[430px] [&_.project-preview-compact]:lg:h-[180px] [&_.project-preview-compact]:lg:aspect-auto"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="pixel-section-kicker">
                  <span className="pixel-section-icon pixel-section-icon-star" aria-hidden />
                  {copy.featuredProjectsTitle}
                </p>
                <Link
                  className="font-mono text-xs font-semibold text-cyan-200/75 transition hover:text-cyan-100"
                  href={copy.featuredProjectsLink.href}
                >
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

            <PixelCard accent="purple" as="section" className="space-y-3 p-3!">
              <div className="flex items-center justify-between gap-4">
                <p className="pixel-section-kicker">
                  <span className="pixel-section-icon pixel-section-icon-blog" aria-hidden />
                  {copy.blogTitle}
                </p>
                <Link
                  className="font-mono text-xs font-semibold text-cyan-200/75 transition hover:text-cyan-100"
                  href={copy.blogLink.href}
                >
                  {copy.blogLink.label}
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {homePageData.articles.map((post) => (
                  <BlogCard
                    compact
                    key={post.slug}
                    post={post}
                    readLabel={blogCardReadLabel}
                  />
                ))}
              </div>
            </PixelCard>
          </div>

          <div className="space-y-5">
            <Timeline
              compact
              items={homePageData.timeline}
              link={timelineCopy.link}
              title={timelineCopy.title}
            />

            <PixelCard
              accent="purple"
              as="section"
              className="flex flex-col lg:h-[430px]"
            >
              <p className="pixel-section-kicker">
                <span className="pixel-section-icon pixel-section-icon-skills" aria-hidden />
                {copy.skillsTitle}
              </p>
              <div className="mt-4 grid min-h-0 flex-1 auto-rows-min gap-2.5 overflow-y-auto pr-1">
                {homePageData.skills.map((skill) => (
                  <div
                    className="flex min-h-11 items-center gap-3 rounded-[5px] border border-[#26344d] bg-[#101827] px-3 shadow-[inset_0_0_0_1px_#172238]"
                    key={skill.name}
                  >
                    <PixelIcon className="h-4 w-4 shrink-0" name="skills" />
                    <p className="truncate font-mono text-sm font-black text-white">
                      {skill.name}
                    </p>
                  </div>
                ))}
              </div>
              <Link
                className="mt-4 block w-fit self-end font-mono text-xs font-semibold text-cyan-200/75 transition hover:text-cyan-100"
                href={copy.skillsLink.href}
              >
                {copy.skillsLink.label}
              </Link>
            </PixelCard>

            <PixelCard accent="pink" as="section" className="space-y-5">
              <div>
                <p className="font-mono text-sm font-extrabold uppercase tracking-wide text-fuchsia-200">
                  {copy.contactEyebrow}
                </p>
                <h2 className="mt-2 font-mono text-2xl font-black text-white">
                  {copy.contactTitle}
                </h2>
              </div>
              <div className="flex flex-wrap gap-3">
                {contactLinks.map((link) => {
                  return (
                    <a
                      aria-label={link.label}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-[4px] border border-[#30445f] bg-[#101827] text-[#bfe7eb] shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                      href={link.href}
                      key={link.label}
                      rel={/^https?:\/\//.test(link.href) ? "noreferrer" : undefined}
                      target={/^https?:\/\//.test(link.href) ? "_blank" : undefined}
                    >
                      <PixelIcon className="h-5 w-5" name={link.icon} />
                    </a>
                  );
                })}
              </div>
            </PixelCard>
          </div>
        </div>

      </Container>
    </section>
  );
}
