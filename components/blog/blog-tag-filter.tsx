"use client";

import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { getTagSearchKey } from "@/components/blog/blog-search-utils";
import { cn } from "@/lib/utils";
import type { SiteSettings } from "@/lib/site/settings";
import type { BlogTagOption } from "@/types/blog";

type BlogTagFilterProps = {
  activeTagKeys: Set<string>;
  copy: SiteSettings["pages"]["blog"]["search"];
  onSelectTag: (tag: string) => void;
  tags: BlogTagOption[];
};

export function BlogTagFilter({
  activeTagKeys,
  copy,
  onSelectTag,
  tags,
}: BlogTagFilterProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <PixelCard accent="purple" className="space-y-3">
      <div className="flex items-center gap-2 font-mono text-sm font-bold text-violet-100">
        <PixelIcon className="h-4 w-4" name="file" />
        {copy.hashtagsTitle}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map(({ count, tag }) => {
          const isActive = activeTagKeys.has(getTagSearchKey(tag));

          return (
            <button
              className={cn(
                "rounded-[3px] border px-2 py-1 font-mono text-[11px] font-bold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200",
                isActive
                  ? "border-[#6ea8b0] bg-[#151e2f] text-[#b9dfe3] shadow-[inset_0_0_0_1px_#1c2b43]"
                  : "border-[#315467] bg-[#111c2f] text-[#d3c4e4] hover:border-[#6ea8b0]",
              )}
              key={tag}
              onClick={() => onSelectTag(tag)}
              type="button"
            >
              {tag}
              <span className="ml-1 text-slate-400">{count}</span>
            </button>
          );
        })}
      </div>
    </PixelCard>
  );
}
