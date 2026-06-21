"use client";

import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { cn } from "@/lib/utils";
import type { BlogSeriesOption, BlogSortOrder } from "@/types/blog";

type BlogSeriesFilterProps = {
  activeSeriesSlug?: string;
  onClearSeries: () => void;
  onSelectSeries: (slug: string) => void;
  onToggleSortOrder: () => void;
  series: BlogSeriesOption[];
  sortOrder: BlogSortOrder;
};

export function BlogSeriesFilter({
  activeSeriesSlug,
  onClearSeries,
  onSelectSeries,
  onToggleSortOrder,
  series,
  sortOrder,
}: BlogSeriesFilterProps) {
  if (series.length === 0) {
    return null;
  }

  return (
    <PixelCard accent="cyan" className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 font-mono text-sm font-bold text-cyan-100">
          <PixelIcon className="h-4 w-4" name="journey" />
          <span className="truncate">Series</span>
        </div>
        <button
          className="rounded-[3px] border border-[#315467] bg-[#111c2f] px-2 py-1 font-mono text-[11px] font-bold text-[#b9dfe3] transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!activeSeriesSlug}
          onClick={onToggleSortOrder}
          type="button"
        >
          {sortOrder === "newest" ? "Newest" : "Oldest"}
        </button>
      </div>

      <div className="pixel-scrollbar grid max-h-72 gap-2 overflow-y-auto pr-1">
        {series.map((seriesOption) => {
          const isActive = activeSeriesSlug === seriesOption.slug;

          return (
            <button
              className={cn(
                "grid min-h-10 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[4px] border px-3 py-2 text-left font-mono transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200",
                isActive
                  ? "border-[#6ea8b0] bg-[#151e2f] text-[#b9dfe3] shadow-[inset_0_0_0_1px_#1c2b43]"
                  : "border-[#315467] bg-[#111c2f] text-[#d3c4e4] hover:border-[#6ea8b0] hover:bg-[#151e2f]",
              )}
              key={seriesOption.slug}
              onClick={() => onSelectSeries(seriesOption.slug)}
              type="button"
            >
              <span className="truncate text-xs font-bold">{seriesOption.title}</span>
              <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-[3px] border border-[#26344d] bg-[#0b1220] px-1.5 text-[11px] text-slate-300">
                {seriesOption.count}
              </span>
            </button>
          );
        })}
      </div>

      {activeSeriesSlug ? (
        <button
          className="font-mono text-[11px] font-bold text-[#8ed2d8] transition hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          onClick={onClearSeries}
          type="button"
        >
          Clear series
        </button>
      ) : null}
    </PixelCard>
  );
}
