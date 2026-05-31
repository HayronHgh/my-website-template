"use client";

import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { cn, formatDate } from "@/lib/utils";
import type { SiteSettings } from "@/lib/site/settings";
import type { BlogPost } from "@/types/blog";

type BlogPostShowcaseProps = {
  copy: SiteSettings["pages"]["blog"]["search"];
  isSearching: boolean;
  onSelectPost: (slug: string) => void;
  onSelectTag: (tag: string) => void;
  posts: BlogPost[];
};

function getReadTime(post: BlogPost) {
  const cjkCharacters = post.content.match(/[\u4e00-\u9fff]/g)?.length ?? 0;
  const words = post.content.trim().split(/\s+/).filter(Boolean).length;
  const estimatedUnits = words + cjkCharacters / 2;

  return Math.max(5, Math.ceil(estimatedUnits / 180));
}

function getPostIcon(post: BlogPost) {
  const searchText = [...post.tags, post.series?.title ?? "", post.title].join(" ").toLowerCase();

  if (searchText.includes("typescript")) {
    return "tech-ts" as const;
  }

  if (searchText.includes("markdown")) {
    return "file" as const;
  }

  if (searchText.includes("deploy") || searchText.includes("docker")) {
    return "projects" as const;
  }

  return "skills" as const;
}

const categoryToneClasses = {
  architecture: "border-[#315467] bg-[#111c2f] text-[#b9dfe3] hover:border-[#6ea8b0]",
  deployment: "border-[#5d4b32] bg-[#1d1720] text-[#e0c28f] hover:border-[#c79658]",
  markdown: "border-[#4b3e61] bg-[#151426] text-[#d3c4e4] hover:border-[#a997c2]",
  default: "border-[#315467] bg-[#111c2f] text-[#d7e9ee] hover:border-[#6ea8b0]",
};

function getCategoryToneClass(post: BlogPost) {
  const searchText = [...post.tags, post.series?.title ?? ""].join(" ").toLowerCase();

  if (searchText.includes("deploy") || searchText.includes("docker")) {
    return categoryToneClasses.deployment;
  }

  if (searchText.includes("markdown")) {
    return categoryToneClasses.markdown;
  }

  if (searchText.includes("architecture") || searchText.includes("type")) {
    return categoryToneClasses.architecture;
  }

  return categoryToneClasses.default;
}

export function BlogPostShowcase({
  copy,
  isSearching,
  onSelectPost,
  onSelectTag,
  posts,
}: BlogPostShowcaseProps) {
  return (
    <PixelCard accent="cyan" className="space-y-4 p-3!">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
        <div>
          <h2 className="font-mono text-xl font-black text-white">
            {isSearching ? copy.searchResultsTitle : copy.latestArticlesTitle}
          </h2>
          <p className="mt-1 text-sm leading-6 text-[#9fb0d8]">
            {isSearching
              ? `${posts.length} ${
                  posts.length === 1 ? copy.matchingArticleSingular : copy.matchingArticlePlural
                }`
              : copy.latestArticlesDescription}
          </p>
        </div>
      </div>

      {posts.length > 0 ? (
        <div className="grid gap-3">
          {posts.map((post) => (
            <article
              className="pixel-card group relative grid min-h-[172px] overflow-hidden rounded-[6px] border border-[#26344d] bg-[#0b1220] p-4 shadow-[inset_0_0_0_1px_#111b2d,0_8px_22px_rgba(0,0,0,0.24)] transition-colors duration-200 hover:border-[#5f7c94] hover:bg-[#101827] hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.055),0_10px_28px_rgba(0,0,0,0.28),0_0_14px_rgba(34,211,238,0.06)] sm:grid-cols-[minmax(0,1fr)_150px] sm:gap-5"
              key={post.slug}
            >
              <div className="flex min-w-0 flex-col">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono text-xs text-[#8ea0c8]">
                  <button
                    className={cn(
                      "inline-flex max-w-full items-center gap-1.5 truncate rounded-[3px] border px-2 py-1 font-bold transition duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200",
                      getCategoryToneClass(post),
                    )}
                    onClick={() => onSelectTag(post.tags[0] ?? post.series?.title ?? post.title)}
                    type="button"
                  >
                    <span aria-hidden className="shrink-0">
                      #
                    </span>
                    {post.tags[0] ?? post.series?.title ?? copy.categoryFallback}
                  </button>
                  <time className="inline-flex min-h-7 items-center" dateTime={post.date}>
                    {formatDate(post.date)}
                  </time>
                </div>

                <button
                  className="mt-4 block rounded-[4px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200"
                  onClick={() => onSelectPost(post.slug)}
                  type="button"
                >
                  <h3 className="clamp-2 font-mono text-xl font-black leading-7 text-white transition group-hover:text-cyan-100">
                    {post.title}
                  </h3>
                  <p className="clamp-2 mt-3 max-w-[64ch] text-sm leading-6 text-[#aeb9cc]">
                    {post.summary}
                  </p>
                </button>

                <div className="mt-auto flex items-end justify-between gap-3 pt-4">
                  <p className="inline-flex items-center gap-2 font-mono text-xs text-[#7f8db3]">
                    <PixelIcon className="h-3.5 w-3.5" name="clock" />
                    {getReadTime(post)} {copy.readTimeSuffix}
                  </p>
                  <button
                    className="inline-flex h-9 items-center gap-2 rounded-[4px] border border-[#30445f] bg-[#101827] px-3 font-mono text-xs font-bold text-[#b9dfe3] shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                    onClick={() => onSelectPost(post.slug)}
                    type="button"
                  >
                    {copy.readButtonLabel}
                    <span aria-hidden>-&gt;</span>
                  </button>
                </div>
              </div>

              <div className="mt-4 hidden items-center justify-center sm:mt-0 sm:flex">
                <div
                  className={cn(
                    "relative flex h-28 w-32 items-center justify-center overflow-hidden rounded-[5px] border bg-[#101827] shadow-[inset_0_0_0_1px_#172238]",
                    post.tags[0]?.toLowerCase().includes("deployment")
                      ? "border-amber-300/20"
                      : "border-[#26344d]",
                  )}
                >
                  <div className="absolute inset-2 rounded-[3px] border border-[#26344d] bg-[#0b172b]" />
                  <div className="absolute left-3 top-3 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-[2px] bg-cyan-200/70" />
                    <span className="h-1.5 w-8 rounded-[2px] bg-cyan-200/20" />
                  </div>
                  <PixelIcon className="relative h-12 w-12 opacity-90" name={getPostIcon(post)} />
                  <div className="absolute inset-x-3 bottom-3 grid gap-1.5">
                    <span className="h-1 rounded-[2px] bg-cyan-200/18" />
                    <span className="h-1 w-2/3 rounded-[2px] bg-cyan-200/12" />
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-[4px] border border-[#26344d] bg-[#101827] p-5 text-sm leading-6 text-[#9fb0d8]">
          {copy.emptyMessage}
        </p>
      )}
    </PixelCard>
  );
}
