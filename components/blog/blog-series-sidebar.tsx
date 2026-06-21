"use client";

import { useMemo, useState } from "react";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { cn, formatDate } from "@/lib/utils";
import type { SiteSettings } from "@/lib/site/settings";
import type { BlogPostMeta } from "@/types/blog";

type BlogSeriesSidebarProps = {
  copy: SiteSettings["pages"]["blog"]["series"];
  onSelectPost: (slug: string) => void;
  posts: BlogPostMeta[];
  selectedSlug?: string;
};

type SeriesGroup = {
  slug: string;
  title: string;
  posts: BlogPostMeta[];
};

const STANDALONE_SERIES_SLUG = "__standalone";

function createSeriesGroups(posts: BlogPostMeta[], standaloneLabel: string) {
  const groups = new Map<string, SeriesGroup>();

  posts.forEach((post) => {
    const slug = post.series?.slug ?? STANDALONE_SERIES_SLUG;
    const title = post.series?.title ?? standaloneLabel;
    const group = groups.get(slug) ?? {
      slug,
      title,
      posts: [],
    };

    group.posts.push(post);
    groups.set(slug, group);
  });

  return [...groups.values()]
    .map((group) => ({
      ...group,
      posts: [...group.posts].sort(
        (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime(),
      ),
    }))
    .sort((left, right) => {
      if (left.slug === STANDALONE_SERIES_SLUG) {
        return 1;
      }

      if (right.slug === STANDALONE_SERIES_SLUG) {
        return -1;
      }

      return left.title.localeCompare(right.title);
    });
}

export function BlogSeriesSidebar({
  copy,
  onSelectPost,
  posts,
  selectedSlug,
}: BlogSeriesSidebarProps) {
  const groups = useMemo(
    () => createSeriesGroups(posts, copy.standaloneLabel),
    [copy.standaloneLabel, posts],
  );
  const selectedGroup = groups.find((group) =>
    group.posts.some((post) => post.slug === selectedSlug),
  );
  const visibleGroups = selectedGroup ? [selectedGroup] : groups.slice(0, 1);
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(selectedGroup ? [selectedGroup.slug] : groups[0] ? [groups[0].slug] : []),
  );

  const toggleGroup = (slug: string) => {
    setOpenGroups((currentGroups) => {
      const nextGroups = new Set(currentGroups);

      if (nextGroups.has(slug)) {
        nextGroups.delete(slug);
      } else {
        nextGroups.add(slug);
      }

      return nextGroups;
    });
  };

  return (
    <PixelCard accent="cyan" className="space-y-4">
      <div className="flex items-center gap-2 font-mono text-base font-bold text-white">
        <PixelIcon className="h-5 w-5" name="journey" />
        {copy.title}
      </div>

      <div className="space-y-3">
        {visibleGroups.map((group) => {
          const isOpen = openGroups.has(group.slug) || group.slug === selectedGroup?.slug;

          return (
            <section className="rounded-[5px] border border-[#26344d] bg-[#101827] shadow-[inset_0_0_0_1px_#172238]" key={group.slug}>
              <button
                className="flex w-full items-center justify-between gap-3 rounded-[4px] px-3 py-3 text-left font-mono text-sm font-bold text-slate-100 transition-colors duration-150 hover:text-cyan-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                onClick={() => toggleGroup(group.slug)}
                type="button"
              >
                <span className="truncate">{group.title}</span>
                <span className="inline-flex items-center gap-2 text-xs text-slate-400">
                  {group.posts.length}
                  <span
                    aria-hidden
                    className={cn("font-mono transition", isOpen && "rotate-180 text-cyan-200")}
                  >
                    v
                  </span>
                </span>
              </button>

              {isOpen ? (
                <div className="space-y-1 p-2">
                  {group.posts.map((post) => {
                    const isSelected = post.slug === selectedSlug;

                    return (
                      <button
                        className={cn(
                          "block w-full rounded-sm px-2.5 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200",
                          isSelected
                            ? "bg-[#111a2b] text-[#b9dfe3]"
                            : "text-[#b7c2e0] hover:bg-[#151e2f] hover:text-white",
                        )}
                        key={post.slug}
                        onClick={() => onSelectPost(post.slug)}
                        type="button"
                      >
                        <span className="clamp-2 font-mono text-sm font-semibold leading-6">
                          {post.title}
                        </span>
                        <span className="mt-1 block font-mono text-xs text-[#7f8db3]">
                          {formatDate(post.date)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </PixelCard>
  );
}
