"use client";

import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { ui } from "@/components/ui/pixel-theme";
import { formatDate } from "@/lib/utils";
import type { BlogPost } from "@/types/blog";

type BlogResultListProps = {
  onSelectPost: (slug: string) => void;
  onSelectTag: (tag: string) => void;
  posts: BlogPost[];
  selectedSlug?: string;
};

export function BlogResultList({
  onSelectPost,
  onSelectTag,
  posts,
  selectedSlug,
}: BlogResultListProps) {
  return (
    <PixelCard accent="cyan" className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-mono text-base font-bold text-white">
          <PixelIcon className="h-5 w-5" name="file" />
          Articles
        </h2>
        <span className="font-mono text-xs text-[#9fb0d8]">{posts.length} found</span>
      </div>

      {posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((post) => {
            const isSelected = post.slug === selectedSlug;

            return (
              <article
                className={
                  isSelected
                    ? "rounded-[4px] border border-[#6ea8b0] bg-[#151e2f] p-4 shadow-[inset_0_0_0_1px_#1c2b43]"
                    : "rounded-[4px] border border-[#26344d] bg-[#101827] p-4 transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f]"
                }
                key={post.slug}
              >
                <button
                  className="block w-full text-left"
                  onClick={() => onSelectPost(post.slug)}
                  type="button"
                >
                  <div className="flex items-center gap-2 font-mono text-xs text-[#8ea0c8]">
                    <PixelIcon className="h-3.5 w-3.5" name="clock" />
                    <time dateTime={post.date}>{formatDate(post.date)}</time>
                  </div>
                  <h3 className="clamp-2 mt-3 font-mono text-lg font-bold leading-7 text-white">
                    {post.title}
                  </h3>
                  <p className="clamp-2 mt-2 text-sm leading-6 text-[#c7d2ee]">
                    {post.summary}
                  </p>
                </button>

                <div className="mt-3 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <button
                      className={`${ui.tinyTag} inline-flex max-w-full items-center gap-1.5 leading-none transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50`}
                      key={tag}
                      onClick={() => onSelectTag(tag)}
                      type="button"
                    >
                      <span aria-hidden className="shrink-0 text-[#8ed2d8]">#</span>
                      <span className="truncate">{tag}</span>
                    </button>
                  ))}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="rounded-[4px] border border-[#26344d] bg-[#101827] p-4 text-sm leading-6 text-[#9fb0d8]">
          No matching article.
        </p>
      )}
    </PixelCard>
  );
}
