"use client";

import { BackControl } from "@/components/ui/back-control";
import { ArticleHeader } from "@/components/blog/article-header";
import { MarkdownCopyButtons } from "@/components/blog/markdown-copy-buttons";
import { PixelCard } from "@/components/ui/pixel-card";
import { getRelatedProjectsForPost } from "@/lib/projects/relations";
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
    <PixelCard accent="purple" as="article" className="article-reader">
      <ArticleHeader
        back={<BackControl onClick={onBack} />}
        headingLevel="h2"
        onSelectTag={onSelectTag}
        post={post}
        relatedProjectLabel={copy.relatedProjectLabel}
        relatedProjects={relatedProjects}
      />

      <div className="prose-content" dangerouslySetInnerHTML={{ __html: post.html }} />
      <MarkdownCopyButtons />
    </PixelCard>
  );
}
