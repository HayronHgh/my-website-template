import { PixelIcon } from "@/components/ui/pixel-icon";
import { cn } from "@/lib/utils";
import type { SkillItem, SkillTone } from "@/data/site";

type SkillCardProps = {
  compact?: boolean;
  skill: SkillItem;
};

const toneClasses: Record<SkillTone, string> = {
  cyan: "border-[#315467] bg-[#0c1a2a] text-[#b9dfe3]",
  green: "border-[#405434] bg-[#101a18] text-[#d4e8b5]",
  blue: "border-[#334466] bg-[#101827] text-[#c3cae7]",
  purple: "border-[#4b3e61] bg-[#141426] text-[#d3c4e4]",
  amber: "border-[#5d4b32] bg-[#1d1720] text-[#e0c28f]",
};

export function SkillCard({ compact, skill }: SkillCardProps) {
  const subtitle = skill.subtitle ?? skill.level ?? skill.note;
  const evidence = skill.evidence ?? [];

  return (
    <article
      className={cn(
        "rounded-[6px] border p-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.035)]",
        toneClasses[skill.tone],
        compact && "p-3",
      )}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] border border-current/25 bg-[#050914]/50">
          <PixelIcon className="h-4 w-4" name="skills" />
        </span>
        <div className="min-w-0">
          <h3
            className={cn(
              "font-mono font-black leading-6 text-white",
              compact ? "text-sm" : "text-base",
            )}
          >
            {skill.name}
          </h3>
          {subtitle ? (
            <p className={cn("mt-1 leading-5 text-current/85", compact ? "text-xs" : "text-sm")}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {!compact && skill.note && skill.note !== subtitle ? (
        <p className="mt-3 text-sm leading-6 text-[#b7c2e0]">{skill.note}</p>
      ) : null}

      {evidence.length ? (
        <ul className={cn("grid gap-1.5", compact ? "mt-3" : "mt-4")}>
          {evidence.map((item) => (
            <li className="flex gap-2 text-sm leading-6 text-[#c7d2ee]" key={item}>
              <span aria-hidden className="font-mono text-current">
                {">"}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </article>
  );
}
