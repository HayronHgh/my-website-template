import type { Metadata } from "next";
import { PageHero } from "@/components/ui/page-hero";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { ui } from "@/components/ui/pixel-theme";
import { SectionTitle } from "@/components/ui/section-title";
import { SkillBar } from "@/components/ui/skill-bar";
import { Timeline } from "@/components/ui/timeline";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { getSiteSettings } from "@/lib/site/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getSiteSettings();

  return {
    title: pages.about.metadata.title,
    description: pages.about.metadata.description,
  };
}

export default async function AboutPage() {
  const { pageImages, pages, siteProfile, skillItems, timelineItems } = await getSiteSettings();
  const pageCopy = pages.about;

  return (
    <Section className="!pt-0 sm:!pt-0">
      <PageHero
        accent="blue"
        artClassName="page-hero-art-journey"
        background={pageImages.aboutHero.src}
        description={pageCopy.hero.description}
        icon="journey"
        imagePosition={pageImages.aboutHero.position}
        title={pageCopy.hero.title}
      />

      <Container className="mt-5 space-y-5">
        <div id="journey" className="scroll-mt-28">
          <Timeline
            items={timelineItems}
            link={pageCopy.timeline.link}
            title={pageCopy.timeline.title}
          />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {pageCopy.stats.map((stat) => (
              <PixelCard accent="blue" className="h-full p-4! text-center" key={stat.label}>
              <PixelIcon className="mx-auto h-5 w-5" name={stat.icon} />
              <p className="mt-3 font-mono text-2xl font-black text-[#8ed2d8]">
                {stat.value}
              </p>
              <p className="mt-1 font-mono text-xs text-[#8fa0bf]">{stat.label}</p>
            </PixelCard>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <PixelCard accent="cyan" className="space-y-5">
            <div className="mx-auto max-w-[16.25rem] overflow-hidden rounded-[4px] border border-[#26344d] bg-[#07101d] shadow-[inset_0_0_0_1px_#111b2d]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={pageCopy.avatarAlt}
                className="block aspect-square w-full object-cover [image-rendering:pixelated]"
                src={pageImages.aboutAvatar.src}
              />
            </div>
            <div className="grid gap-3">
              {siteProfile.facts.map((fact) => (
                <div
                  className={`${ui.panelSoft} px-3 py-2`}
                  key={fact.label}
                >
                  <p className="font-mono text-xs text-[#7f8db3]">{fact.label}</p>
                  <p className="text-sm font-semibold text-slate-100">{fact.value}</p>
                </div>
              ))}
            </div>
          </PixelCard>

          <PixelCard accent="purple" className="space-y-5">
            <SectionTitle
              accent="purple"
              description={siteProfile.intro}
              eyebrow={pageCopy.profileEyebrow}
              title={pageCopy.profileTitle}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {siteProfile.specialties.map((item) => (
                <div
                  className="rounded-[4px] border border-[#26344d] bg-[#101827] p-3 shadow-[inset_0_0_0_1px_#172238]"
                  key={item}
                >
                  <PixelIcon className="mb-3 h-5 w-5" name="skills" />
                  <p className="font-mono text-sm text-slate-100">{item}</p>
                </div>
              ))}
            </div>
          </PixelCard>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <PixelCard accent="amber" className="space-y-5">
            <div className="flex items-center gap-2 text-amber-200">
              <PixelIcon className="h-5 w-5" name="star" />
              <h2 className="font-mono text-xl font-bold text-white">
                {pageCopy.principlesTitle}
              </h2>
            </div>
            <div className="grid gap-3">
              {pageCopy.principles.map((item) => (
                <p
                  className="rounded-[4px] border border-[#26344d] bg-[#101827] p-4 text-sm leading-7 text-[#b7c2e0] shadow-[inset_0_0_0_1px_#172238]"
                  key={item}
                >
                  {item}
                </p>
              ))}
            </div>
          </PixelCard>

          <PixelCard accent="green" className="space-y-5">
            <div className="flex items-center gap-2 text-lime-200">
              <PixelIcon className="h-5 w-5" name="skills" />
              <h2 className="font-mono text-xl font-bold text-white">{pageCopy.toolsTitle}</h2>
            </div>
            {skillItems.map((skill) => (
              <SkillBar key={skill.name} skill={skill} />
            ))}
          </PixelCard>
        </div>
      </Container>
    </Section>
  );
}
