"use client";

import Link from "next/link";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { ui } from "@/components/ui/pixel-theme";
import { getRelatedProjectsForPost } from "@/lib/projects/relations";
import { formatDate } from "@/lib/utils";
import type { ProjectItem } from "@/data/site";
import type { SiteSettings } from "@/lib/site/settings";
import type { BlogPost } from "@/types/blog";

type BlogReaderProps = {
  copy: SiteSettings["pages"]["blog"]["reader"];
  isLoading?: boolean;
  onBack: () => void;
  onSelectTag: (tag: string) => void;
  post?: BlogPost;
  projects: ProjectItem[];
};

export function BlogReader({
  copy,
  isLoading = false,
  onBack,
  onSelectTag,
  post,
  projects,
}: BlogReaderProps) {
  if (!post) {
    return (
      <PixelCard accent="purple" className="min-h-96">
        <div className="flex min-h-72 items-center justify-center text-center text-sm text-[#9fb0d8]">
          {isLoading ? "Loading article..." : copy.noSelectionMessage}
        </div>
      </PixelCard>
    );
  }

  const relatedProjects = getRelatedProjectsForPost(post, projects, 3);

  return (
    <PixelCard accent="purple" as="article" className="space-y-5">
      <button
        className="inline-flex items-center gap-2 rounded-[4px] border border-[#30445f] bg-[#101827] px-3 py-2 font-mono text-sm font-bold text-[#b9dfe3] shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.045)] transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
        onClick={onBack}
        type="button"
      >
        <span aria-hidden className="font-mono">{"<"}</span>
        {copy.backLabel}
      </button>

      <header className="space-y-5">
        <div className="flex flex-wrap gap-2">
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

        <div className="space-y-4">
          {post.series ? (
            <p className="font-mono text-sm font-semibold uppercase text-violet-200">
              {post.series.title}
            </p>
          ) : null}
          <p className="inline-flex items-center gap-2 font-mono text-sm font-semibold uppercase text-cyan-200">
            <PixelIcon className="h-4 w-4" name="clock" />
            <time dateTime={post.date}>{formatDate(post.date)}</time>
          </p>
          <h2 className="font-mono text-3xl font-black leading-[1.15] text-white sm:text-5xl">
            {post.title}
          </h2>
          <p className="text-base leading-8 text-[#c7d2ee] sm:text-lg">{post.summary}</p>
        </div>

        {post.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            alt=""
            className="max-h-[28rem] w-full rounded-[5px] border border-[#26344d] object-cover"
            src={post.coverImage}
          />
        ) : null}

        {relatedProjects.length ? (
          <div className="grid gap-2 sm:grid-cols-3">
            {relatedProjects.map((project) => (
              <Link
                className="rounded-[4px] border border-[#26344d] bg-[#101827] p-3 transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                href={project.detailsUrl}
                key={project.slug}
              >
                <p className="font-mono text-[11px] font-bold uppercase text-[#8ed2d8]">
                  {copy.relatedProjectLabel}
                </p>
                <p className="clamp-2 mt-1 font-mono text-sm font-bold leading-6 text-white">
                  {project.title}
                </p>
              </Link>
            ))}
          </div>
        ) : null}
      </header>

      <div className="prose-content" dangerouslySetInnerHTML={{ __html: post.html }} />
    </PixelCard>
  );
}
