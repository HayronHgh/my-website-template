"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { formatDate } from "@/lib/utils";
import type { ProjectItem } from "@/data/site";
import type { BlogPost } from "@/types/blog";

type ArticleHeaderProps = {
  back: ReactNode;
  headingLevel?: "h1" | "h2";
  onSelectTag?: (tag: string) => void;
  post: BlogPost;
  readTimeMinutes?: number;
  relatedProjectLabel: string;
  relatedProjects: ProjectItem[];
};

/** Shared by the article route and the same-page reader so both read alike. */
export function ArticleHeader({
  back,
  headingLevel: Heading = "h1",
  onSelectTag,
  post,
  readTimeMinutes,
  relatedProjectLabel,
  relatedProjects,
}: ArticleHeaderProps) {
  return (
    <header className="article-header">
      <div className="article-toolbar">
        {back}
        <p className="article-meta">
          <PixelIcon className="h-4 w-4" name="clock" />
          <time dateTime={post.date}>{formatDate(post.date)}</time>
          {readTimeMinutes ? <span>{readTimeMinutes} 分鐘閱讀</span> : null}
        </p>
      </div>

      <div className="article-heading">
        {post.series ? <p className="article-series">{post.series.title}</p> : null}
        <Heading className="article-title">{post.title}</Heading>
        {post.summary ? <p className="article-summary">{post.summary}</p> : null}
      </div>

      {post.tags.length ? (
        <ul className="article-tags" aria-label="標籤">
          {post.tags.map((tag) => (
            <li key={tag}>
              {onSelectTag ? (
                <button onClick={() => onSelectTag(tag)} type="button">
                  <span aria-hidden>#</span>
                  {tag}
                </button>
              ) : (
                <span>
                  <span aria-hidden>#</span>
                  {tag}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {post.coverImage ? (
        <Image
          alt=""
          className="article-cover"
          height={675}
          loading="lazy"
          quality={75}
          sizes="(max-width: 1280px) calc(100vw - 2rem), 860px"
          src={post.coverImage}
          width={1200}
        />
      ) : null}

      {relatedProjects.length ? (
        <nav className="article-related" aria-label={relatedProjectLabel}>
          <span>{relatedProjectLabel}</span>
          {relatedProjects.map((project) => (
            <Link href={project.detailsUrl} key={project.slug}>
              {project.title}
            </Link>
          ))}
        </nav>
      ) : null}
    </header>
  );
}
