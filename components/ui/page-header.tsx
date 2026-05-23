import { cn } from "@/lib/utils";
import type { Accent } from "@/data/site";

type PageHeaderProps = {
  accent?: Accent;
  eyebrow?: string;
  title: string;
  description: string;
  className?: string;
};

const accentClasses: Record<Accent, string> = {
  cyan: "text-cyan-200",
  blue: "text-blue-200",
  purple: "text-violet-200",
  pink: "text-fuchsia-200",
  amber: "text-amber-200",
  green: "text-lime-200",
};

export function PageHeader({
  accent = "cyan",
  eyebrow,
  title,
  description,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("max-w-3xl space-y-4", className)}>
      {eyebrow ? (
        <p className={cn("font-mono text-sm font-semibold uppercase", accentClasses[accent])}>
          {eyebrow}
        </p>
      ) : null}
      <h1 className="font-mono text-4xl font-black leading-[1.12] text-white sm:text-5xl">
        {title}
      </h1>
      <p className="text-lg leading-8 text-[#b7c2e0]">{description}</p>
    </header>
  );
}
