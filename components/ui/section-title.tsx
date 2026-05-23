import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Accent } from "@/data/site";

type SectionTitleProps = {
  accent?: Accent;
  align?: "left" | "center";
  eyebrow: string;
  title: string;
  description?: string;
  icon?: ReactNode;
};

const accentClasses: Record<Accent, string> = {
  cyan: "text-cyan-200",
  blue: "text-blue-200",
  purple: "text-violet-200",
  pink: "text-fuchsia-200",
  amber: "text-amber-200",
  green: "text-lime-200",
};

export function SectionTitle({
  accent = "cyan",
  align = "left",
  description,
  eyebrow,
  icon,
  title,
}: SectionTitleProps) {
  return (
    <div className={cn("space-y-3", align === "center" && "mx-auto max-w-3xl text-center")}>
      <p
        className={cn(
          "flex items-center gap-2 font-mono text-sm font-semibold uppercase",
          align === "center" && "justify-center",
          accentClasses[accent],
        )}
      >
        {icon}
        {eyebrow}
      </p>
      <h2 className="max-w-3xl font-mono text-3xl font-black text-white sm:text-4xl">{title}</h2>
      {description ? (
        <p className="max-w-3xl text-base leading-8 text-[#b7c2e0]">{description}</p>
      ) : null}
    </div>
  );
}
