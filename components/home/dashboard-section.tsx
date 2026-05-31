import Link from "next/link";
import { BlogCard } from "@/components/blog/blog-card";
import { ProjectCard } from "@/components/projects/project-card";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { SkillBar } from "@/components/ui/skill-bar";
import { Timeline } from "@/components/ui/timeline";
import { Container } from "@/components/ui/container";
import type { ProjectItem } from "@/data/site";
import type { SiteSettings } from "@/lib/site/settings";

type DashboardSectionProps = {
  contactLinks: SiteSettings["contactLinks"];
  homePageData: SiteSettings["homePageData"];
  projects: ProjectItem[];
  siteProfile: SiteSettings["siteProfile"];
};

export function DashboardSection({
  contactLinks,
  homePageData,
  projects,
  siteProfile,
}: DashboardSectionProps) {
  const profileFacts = [
    {
      icon: "location",
      label: "Location",
      value: homePageData.profileMeta.location,
    },
    {
      icon: "mail",
      label: "Email",
      value: homePageData.profileMeta.email,
    },
    {
      icon: "clock",
      label: "Timezone",
      value: homePageData.profileMeta.timezone,
    },
    {
      icon: "heart",
      label: "Status",
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
                About Me
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
                  Featured Projects
                </p>
                <Link
                  className="font-mono text-xs font-semibold text-cyan-200/75 transition hover:text-cyan-100"
                  href="/projects"
                >
                  View all -&gt;
                </Link>
              </div>

              <div className="grid flex-1 gap-4 md:grid-cols-3">
                {projects.map((project) => (
                  <ProjectCard compact key={project.slug} project={project} />
                ))}
              </div>
            </PixelCard>

            <PixelCard accent="purple" as="section" className="space-y-3 p-3!">
              <div className="flex items-center justify-between gap-4">
                <p className="pixel-section-kicker">
                  <span className="pixel-section-icon pixel-section-icon-blog" aria-hidden />
                  Blog Signals
                </p>
                <Link
                  className="font-mono text-xs font-semibold text-cyan-200/75 transition hover:text-cyan-100"
                  href="/blog"
                >
                  View blog -&gt;
                </Link>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {homePageData.articles.map((post) => (
                  <BlogCard compact key={post.slug} post={post} />
                ))}
              </div>
            </PixelCard>
          </div>

          <div className="space-y-5">
            <Timeline compact items={homePageData.timeline} />

            <PixelCard
              accent="purple"
              as="section"
              className="flex flex-col lg:h-[430px]"
            >
              <p className="pixel-section-kicker">
                <span className="pixel-section-icon pixel-section-icon-skills" aria-hidden />
                Skills
              </p>
              <div className="mt-4 grid gap-3.5">
                {homePageData.skills.map((skill) => (
                  <SkillBar compact key={skill.name} skill={skill} />
                ))}
              </div>
              <Link
                className="mt-auto block w-fit self-end font-mono text-xs font-semibold text-cyan-200/75 transition hover:text-cyan-100"
                href="/resume"
              >
                More skills -&gt;
              </Link>
            </PixelCard>

            <PixelCard accent="pink" as="section" className="space-y-5">
              <div>
                <p className="font-mono text-sm font-extrabold uppercase tracking-wide text-fuchsia-200">
                  Signal Links
                </p>
                <h2 className="mt-2 font-mono text-2xl font-black text-white">
                  Connect
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
