import { Timeline } from "@/components/ui/timeline";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { Container } from "@/components/ui/container";
import { siteProfile, timelineItems } from "@/data/site";
import type { PixelIconName } from "@/components/ui/pixel-icon";

const factIcons: PixelIconName[] = ["location", "mail", "clock", "heart"];

export function OverviewSection() {
  return (
    <section className="py-14 sm:py-20">
      <Container>
        <div className="grid gap-6 lg:grid-cols-[1.18fr_0.82fr]">
          <PixelCard accent="cyan" className="grid gap-6 md:grid-cols-[220px_1fr]">
            <div className="overflow-hidden rounded-[4px] border border-[#26344d] bg-[#07101d] shadow-[inset_0_0_0_1px_#111b2d]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt="Pixel style engineer avatar"
                className="block aspect-square w-full object-cover [image-rendering:pixelated]"
                src="/pixel-engineer-avatar.svg"
              />
            </div>

            <div className="space-y-5">
              <div>
                <p className="font-mono text-sm font-semibold uppercase text-cyan-200">About Me</p>
                <h2 className="mt-2 font-mono text-2xl font-bold text-white">
                  Build clarity, then ship.
                </h2>
              </div>
              <p className="text-base leading-8 text-slate-300">{siteProfile.intro}</p>

              <div className="grid gap-3 sm:grid-cols-2">
                {siteProfile.facts.map((fact, index) => {
                  const iconName = factIcons[index] ?? "location";
                  return (
                    <div className="flex items-center gap-3 rounded-[4px] border border-[#2b4568] bg-[#081326] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" key={fact.label}>
                      <PixelIcon className="h-4 w-4" name={iconName} />
                      <div>
                        <p className="font-mono text-xs text-slate-500">{fact.label}</p>
                        <p className="text-sm font-semibold text-slate-100">{fact.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </PixelCard>

          <Timeline items={timelineItems} />
        </div>
      </Container>
    </section>
  );
}
