import { PixelHeroScene } from "@/components/home/pixel-hero-scene";
import { NeonButton } from "@/components/ui/neon-button";
import { Container } from "@/components/ui/container";
import { PixelIcon } from "@/components/ui/pixel-icon";
import type { SitePageImages, SiteSettings } from "@/lib/site/settings";

type HeroSectionProps = {
  actions: SiteSettings["pages"]["home"]["heroActions"];
  homePageData: SiteSettings["homePageData"];
  pageImages: SitePageImages;
  siteProfile: SiteSettings["siteProfile"];
};

export function HeroSection({
  actions,
  homePageData,
  pageImages,
  siteProfile,
}: HeroSectionProps) {
  const { hero } = homePageData;
  const titleTop = hero.titleTop.trim();
  const titleBottom = hero.titleBottom.trim();
  const highlightedName =
    siteProfile.name && titleTop.endsWith(siteProfile.name) ? siteProfile.name : "";
  const titlePrefix = highlightedName
    ? titleTop.slice(0, -highlightedName.length).trimEnd()
    : titleTop;

  return (
    <section className="relative min-h-[420px] overflow-hidden border-b border-cyan-200/10 sm:min-h-[430px] lg:min-h-[430px] 2xl:min-h-[450px]">
      <PixelHeroScene imageSrc={pageImages.homeHero.src} />
      <Container className="relative z-10 flex min-h-[inherit] items-end pb-12 pt-20 sm:pb-14 lg:pb-16 lg:pt-24">
        <div className="max-w-[560px] space-y-4 lg:max-w-[590px]">
          <div>
            <h1 className="font-mono text-4xl font-black leading-[0.95] tracking-tight text-white drop-shadow-[3px_3px_0_rgba(76,29,149,0.72)] md:text-5xl xl:text-6xl">
              <span>{titlePrefix}</span>
              {highlightedName ? (
                <>
                  {" "}
                  <span className="text-[#f6c445] drop-shadow-[0_0_14px_rgba(251,191,36,0.58)]">
                    {highlightedName}
                  </span>
                </>
              ) : null}
              {titleBottom ? (
                <span className="block text-[#f6c445] drop-shadow-[0_0_14px_rgba(251,191,36,0.58)]">
                  {titleBottom}
                </span>
              ) : null}
            </h1>
            <p className="mt-4 max-w-[520px] text-[17px] leading-8 text-[#f3f0dc] drop-shadow-[2px_2px_0_rgba(15,23,42,0.72)] sm:text-[18px]">
              {hero.description}
            </p>
          </div>

          <div className="flex flex-wrap gap-3 lg:hidden">
            <NeonButton accent="cyan" href={actions.projects.href}>
              <PixelIcon className="h-5 w-5" name="projects" />
              {actions.projects.label}
            </NeonButton>
            <NeonButton
              accent="amber"
              href={actions.resume.href || siteProfile.resumeDownloadUrl}
              variant="secondary"
              download
            >
              <PixelIcon className="h-5 w-5" name="resume" />
              {actions.resume.label}
            </NeonButton>
            <NeonButton accent="pink" href={actions.contact.href} variant="secondary">
              <PixelIcon className="h-5 w-5" name="contact" />
              {actions.contact.label}
            </NeonButton>
          </div>
        </div>
      </Container>
    </section>
  );
}
