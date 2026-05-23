import type { CSSProperties, ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { PixelIcon, type PixelIconName } from "@/components/ui/pixel-icon";
import { cn } from "@/lib/utils";
import type { Accent } from "@/data/site";

type PageHeroProps = {
  accent?: Accent;
  artClassName?: string;
  artImageClassName?: string;
  background?: string;
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  description: string;
  eyebrow?: string;
  icon: PixelIconName;
  imagePosition?: string;
  title: string;
};

const accentClasses: Record<Accent, string> = {
  cyan: "text-[#8ed2d8]",
  blue: "text-[#a6b5e6]",
  purple: "text-[#c5addf]",
  pink: "text-[#d79fbd]",
  amber: "text-[#e0b26c]",
  green: "text-[#b8d889]",
};

export function PageHero({
  accent = "cyan",
  artClassName,
  artImageClassName,
  background,
  children,
  className,
  contentClassName,
  description,
  eyebrow,
  icon,
  imagePosition = "center center",
  title,
}: PageHeroProps) {
  const imageStyle = {
    "--page-hero-image": background ? `url(${background})` : "none",
    "--page-hero-position": imagePosition,
    "--page-hero-safe-top": "86px",
    "--page-hero-safe-bottom": "12px",
  } as CSSProperties;

  return (
    <>
      {background ? <link as="image" fetchPriority="high" href={background} rel="preload" /> : null}
      <section
        className={cn(
          "relative isolate w-full overflow-hidden border-y border-[#26344d] bg-[#050714]",
          className,
        )}
        style={imageStyle}
      >
        {/* Blurred backdrop disabled to keep the route hero art crisp and less noisy.
        <div
          className="absolute inset-x-[-4%] inset-y-[-10%] -z-30 bg-cover opacity-[0.9] blur-[2px] brightness-110 saturate-110 [background-image:var(--page-hero-image)] [background-position:var(--page-hero-position)] [image-rendering:pixelated] [transform:scale(1.03)]"
        />
        */}
        {background ? (
          <div className={cn("page-hero-art", artClassName)}>
            <div className={cn("page-hero-art-image", artImageClassName)} />
          </div>
        ) : null}
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,#050714_0%,rgba(5,7,20,0.24)_11%,rgba(5,7,20,0.04)_38%,rgba(5,7,20,0.04)_62%,rgba(5,7,20,0.24)_89%,#050714_100%),linear-gradient(180deg,rgba(5,7,20,0.16)_0%,rgba(5,7,20,0)_48%,rgba(5,7,20,0.24)_100%)]" />
        <div className="absolute inset-x-0 top-0 -z-10 h-24 bg-[linear-gradient(180deg,#050714_0%,rgba(5,7,20,0.44)_48%,rgba(5,7,20,0)_100%)]" />
        <div className="absolute inset-y-0 left-0 -z-10 w-[36%] bg-[linear-gradient(90deg,rgba(5,7,20,0.26)_0%,rgba(5,7,20,0.08)_52%,transparent_100%)]" />

        <Container
          className={cn(
            "relative z-10 flex min-h-[400px] items-end pb-12 pt-24 sm:min-h-[420px] sm:pb-14 sm:pt-28 lg:min-h-[440px] lg:pb-16",
            contentClassName,
          )}
        >
          <div className="max-w-2xl">
            {eyebrow ? (
              <p className="mb-6 inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wide text-[#9fb0d8]">
                <PixelIcon className="h-4 w-4" name={icon} />
                {eyebrow}
              </p>
            ) : null}

            <div className="flex items-start gap-3">
              <PixelIcon
                className={cn("mt-1 h-8 w-8 shrink-0", accentClasses[accent])}
                name={icon}
              />
              <div className="min-w-0">
                <h1 className="break-words font-mono text-4xl font-black leading-[0.95] tracking-tight text-white drop-shadow-[2px_2px_0_rgba(3,7,18,0.9)] sm:text-5xl sm:leading-none">
                  {title}
                </h1>
                <p className="mt-4 max-w-[40rem] text-sm leading-7 text-[#d5def0] drop-shadow-[1px_1px_0_rgba(3,7,18,0.82)] sm:text-base">
                  {description}
                </p>
              </div>
            </div>

            {children ? <div className="mt-6">{children}</div> : null}
          </div>
        </Container>
      </section>
    </>
  );
}
