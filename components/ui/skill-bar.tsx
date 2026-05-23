import { cn } from "@/lib/utils";
import type { SkillItem, SkillTone } from "@/data/site";

type SkillBarProps = {
  compact?: boolean;
  skill: SkillItem;
};

const fillClasses: Record<SkillTone, string> = {
  cyan: "bg-[#48a9bc] shadow-[inset_0_-1px_0_#2f7180,inset_0_1px_0_#8ed2d8]",
  green: "bg-[#82a957] shadow-[inset_0_-1px_0_#566c38,inset_0_1px_0_#b8d889]",
  blue: "bg-[#6578bc] shadow-[inset_0_-1px_0_#3d4f78,inset_0_1px_0_#a6b5e6]",
  purple: "bg-[#8d6eb8] shadow-[inset_0_-1px_0_#594871,inset_0_1px_0_#c5addf]",
  amber: "bg-[#c7823a] shadow-[inset_0_-1px_0_#765b36,inset_0_1px_0_#e0b26c]",
};

export function SkillBar({ compact, skill }: SkillBarProps) {
  if (compact) {
    return (
      <div
        className="grid grid-cols-[minmax(0,9rem)_minmax(4.25rem,0.8fr)_2.75rem] items-center gap-2.5"
        aria-label={`${skill.name} proficiency ${skill.value}%`}
      >
        <p className="truncate font-mono text-sm font-semibold text-[#d7deef]">
          {skill.name}
        </p>
        <div
          className="h-2.5 overflow-hidden rounded-[2px] border border-[#303a52] bg-[#1b2435]"
          role="img"
        >
          <div
            className={cn("h-full rounded-[1px]", fillClasses[skill.tone])}
            style={{ width: `${skill.value}%` }}
          />
        </div>
        <span className="text-right font-mono text-sm font-semibold text-[#d7deef]">
          {skill.value}%
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-sm font-extrabold text-white">{skill.name}</p>
          {!compact && skill.note ? (
            <p className="mt-1 text-xs leading-5 text-[#9fb0d8]">{skill.note}</p>
          ) : null}
        </div>
        <span className="font-mono text-xs font-bold text-cyan-100">{skill.value}%</span>
      </div>
      <div
        aria-label={`${skill.name} proficiency ${skill.value}%`}
        className="h-3 overflow-hidden rounded-[2px] border border-[#303a52] bg-[#1b2435]"
        role="img"
      >
        <div
          className={cn("h-full rounded-[1px]", fillClasses[skill.tone])}
          style={{ width: `${skill.value}%` }}
        />
      </div>
    </div>
  );
}
