import Link from "next/link";
import { PixelCard } from "@/components/ui/pixel-card";
import { cn } from "@/lib/utils";
import type { TimelineItem } from "@/data/site";

type TimelineProps = {
  compact?: boolean;
  items: TimelineItem[];
  link?: {
    href: string;
    label: string;
  };
  title?: string;
};

export function Timeline({
  compact,
  items,
  link = { href: "/about", label: "More about my journey ->" },
  title = "Growth Timeline",
}: TimelineProps) {
  const displayItems = compact ? [...items].reverse() : items;

  return (
    <PixelCard
      accent="green"
      className={cn(
        compact ? "min-h-[180px] px-4! py-3! lg:h-[202px]" : "p-5!",
        compact ? "flex h-full flex-col justify-between" : "h-full",
      )}
      id="journey"
    >
      <div className={cn("flex items-center gap-2 text-[#d4e8b5]", compact ? "mb-2" : "mb-5")}>
        <span
          aria-hidden
          className={cn(
            "pixel-section-icon pixel-section-icon-growth",
            compact && "h-4! w-4!",
          )}
        />
        <h2 className={cn("font-mono font-extrabold text-white", compact ? "text-sm text-[#eef3ff]" : "text-lg")}>
          {title}
        </h2>
      </div>
      <ol className={cn(compact ? "space-y-1" : "space-y-5")}>
        {displayItems.map((item, index) => (
          <li
            className={cn(
              "grid grid-cols-[20px_72px_minmax(0,1fr)] items-start gap-4",
              compact && "grid-cols-[12px_44px_minmax(0,1fr)] items-center gap-2",
            )}
            key={item.year}
          >
            <span className={cn("relative block h-full", compact ? "min-h-5" : "mt-1 min-h-18")}>
              {index < displayItems.length - 1 ? (
                <span
                  className={cn(
                    "absolute w-px bg-lime-200/24 shadow-[0_0_10px_rgba(184,216,137,0.12)]",
                    compact
                      ? "left-[5px] top-1/2 h-[calc(100%+0.25rem)]"
                      : "left-[7px] top-1.5 h-[calc(100%+1rem)]",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "absolute left-0 rounded-[3px] border border-lime-200/70 bg-[#9bbf69] shadow-[0_0_0_1px_rgba(49,65,35,0.86),0_0_14px_rgba(184,216,137,0.2)]",
                  compact ? "top-1/2 h-2.5 w-2.5 -translate-y-1/2" : "top-1.5 h-3.5 w-3.5",
                )}
              />
            </span>
            <span
              className={cn(
                "font-mono font-black tracking-tight text-[#d4e8b5]",
                compact ? "text-xs leading-5 text-[#d4e8b5]" : "text-2xl leading-none",
              )}
            >
              {item.year}
            </span>
            <div>
              <h3
                className={cn(
                  "font-mono font-extrabold text-white",
                  compact ? "truncate text-xs font-semibold leading-5 text-[#d7deef]" : "text-sm leading-6 sm:text-base",
                )}
              >
                {item.title}
              </h3>
              {compact ? null : (
                <p className="mt-1.5 text-sm leading-7 text-[#b7c2e0]">
                  {item.summary}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
      {compact ? (
        <Link
          className="mt-2 self-end rounded-sm px-1 py-1 font-mono text-xs font-semibold text-[#9dcdd3] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          href={link.href}
        >
          {link.label}
        </Link>
      ) : null}
    </PixelCard>
  );
}
