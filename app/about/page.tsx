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
import { siteProfile, skillItems, timelineItems } from "@/data/site";

export const metadata: Metadata = {
  title: "About",
  description: "Profile, working style, skills, and growth timeline for this portfolio template.",
};

const journeyPrinciples = [
  "每個專案都先確認問題、使用者與資料流，再決定要做成網頁、桌面工具或後端服務。",
  "交付時先讓核心流程可用，再逐步補上權限、紀錄、查詢效能與例外處理。",
  "工具不是展示用清單，只有能降低交付摩擦、讓下一次迭代更清楚，才算有價值。",
];

export default function AboutPage() {
  return (
    <Section className="!pt-0 sm:!pt-0">
      <PageHero
        accent="blue"
        artClassName="page-hero-art-journey"
        description="從資訊科、資工系到獨立系統交付的成長路線，整理我如何把技術轉成可用工具。"
        icon="journey"
        imagePosition="center center"
        title="Journey"
      />

      <Container className="mt-5 space-y-5">
        <div id="journey" className="scroll-mt-28">
          <Timeline items={timelineItems} />
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          {[
            { icon: "journey" as const, label: "Years of Journey", value: "4+" },
            { icon: "projects" as const, label: "Landed Cases", value: "3+" },
            { icon: "skills" as const, label: "Tech Learned", value: "10+" },
            { icon: "heart" as const, label: "Direction", value: "Build" },
          ].map((stat) => (
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
            <div
              aria-label="Abstract pixel terminal avatar placeholder"
              className="pixel-avatar pixel-avatar-compact mx-auto w-full max-w-[16.25rem]"
              role="img"
            >
              <div className="avatar-screen" />
              <div className="avatar-head" />
              <div className="avatar-body" />
              <div className="avatar-laptop" />
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
              eyebrow="Profile"
              title="Growth notes from the route"
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
              <h2 className="font-mono text-xl font-bold text-white">Route Principles</h2>
            </div>
            <div className="grid gap-3">
              {journeyPrinciples.map((item) => (
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
              <h2 className="font-mono text-xl font-bold text-white">Tools Along the Route</h2>
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
