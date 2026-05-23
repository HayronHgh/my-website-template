"use client";

import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { ui } from "@/components/ui/pixel-theme";

type BlogSearchInputProps = {
  activeTags: string[];
  onClear: () => void;
  onQueryChange: (query: string) => void;
  onRemoveTag: (tag: string) => void;
  query: string;
};

export function BlogSearchInput({
  activeTags,
  onClear,
  onQueryChange,
  onRemoveTag,
  query,
}: BlogSearchInputProps) {
  return (
    <PixelCard accent="cyan" className="space-y-4">
      <label className="flex min-h-12 items-center gap-3 rounded-[4px] border border-[#26344d] bg-[#101827] px-3 text-[#b9dfe3] shadow-[inset_0_0_0_1px_#172238] transition duration-200 focus-within:border-[#6ea8b0] focus-within:shadow-[inset_0_0_0_1px_#1c2b43,0_0_12px_rgba(34,211,238,0.06)]">
        <PixelIcon className="h-5 w-5 shrink-0" name="file" />
        <input
          className="min-w-0 flex-1 bg-transparent py-3 font-mono text-sm text-white outline-none placeholder:text-[#7f8db3]"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search title, summary, #tag"
          type="search"
          value={query}
        />
        {query ? (
          <button
            aria-label="Clear search"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[3px] border border-transparent text-[#9fb0d8] transition duration-200 hover:border-[#30445f] hover:bg-[#151e2f] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
            onClick={onClear}
            type="button"
          >
            <span aria-hidden className="font-mono text-sm font-bold">x</span>
          </button>
        ) : null}
      </label>

      {activeTags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeTags.map((tag) => (
            <button
              className={`${ui.tinyTag} inline-flex max-w-full items-center gap-2 leading-none transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50`}
              key={tag}
              onClick={() => onRemoveTag(tag)}
              type="button"
            >
              <span aria-hidden className="shrink-0 text-[#8ed2d8]">#</span>
              <span className="truncate">{tag}</span>
              <span aria-hidden className="shrink-0">x</span>
            </button>
          ))}
        </div>
      ) : null}
    </PixelCard>
  );
}
