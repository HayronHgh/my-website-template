"use client";

import { useMemo, useState } from "react";
import { BlogPostShowcase } from "@/components/blog/blog-post-showcase";
import { BlogReader } from "@/components/blog/blog-reader";
import { BlogSearchInput } from "@/components/blog/blog-search-input";
import {
  addTagToQuery,
  getTagSearchKey,
  parseBlogSearchQuery,
  removeTagFromQuery,
  scoreBlogPost,
} from "@/components/blog/blog-search-utils";
import { BlogSeriesSidebar } from "@/components/blog/blog-series-sidebar";
import { BlogTagFilter } from "@/components/blog/blog-tag-filter";
import type { ProjectItem } from "@/data/site";
import type { BlogPost, BlogTagOption } from "@/types/blog";

type BlogSearchAppProps = {
  posts: BlogPost[];
  projects: ProjectItem[];
  tags: BlogTagOption[];
};

type BlogViewMode = "browse" | "read";

const LATEST_POST_LIMIT = 6;

function comparePostsByFeaturedRankAndDate(left: BlogPost, right: BlogPost) {
  const leftRank =
    typeof left.featuredRank === "number" ? left.featuredRank : Number.POSITIVE_INFINITY;
  const rightRank =
    typeof right.featuredRank === "number" ? right.featuredRank : Number.POSITIVE_INFINITY;

  if (leftRank !== rightRank) {
    return leftRank - rightRank;
  }

  return new Date(right.date).getTime() - new Date(left.date).getTime();
}

export function BlogSearchApp({ posts, projects, tags }: BlogSearchAppProps) {
  const [query, setQuery] = useState("");
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>();
  const [viewMode, setViewMode] = useState<BlogViewMode>("browse");

  const parsedQuery = useMemo(() => parseBlogSearchQuery(query), [query]);
  const isSearching = query.trim().length > 0;

  const tagLookup = useMemo(
    () => new Map(tags.map((tagOption) => [getTagSearchKey(tagOption.tag), tagOption.tag])),
    [tags],
  );

  const activeTags = useMemo(
    () => parsedQuery.tagFilters.map((tagKey) => tagLookup.get(tagKey) ?? tagKey),
    [parsedQuery.tagFilters, tagLookup],
  );

  const activeTagKeys = useMemo(() => new Set(parsedQuery.tagFilters), [parsedQuery.tagFilters]);

  const filteredPosts = useMemo(() => {
    return posts
      .map((post) => ({
        post,
        score: scoreBlogPost(post, parsedQuery),
      }))
      .filter((entry): entry is { post: BlogPost; score: number } => entry.score !== null)
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score;
        }

        return comparePostsByFeaturedRankAndDate(left.post, right.post);
      })
      .map((entry) => entry.post);
  }, [parsedQuery, posts]);

  const displayPosts = isSearching
    ? filteredPosts
    : posts.slice(0, LATEST_POST_LIMIT);

  const selectedPost =
    posts.find((post) => post.slug === selectedSlug) ?? displayPosts[0] ?? posts[0];

  const handleToggleTag = (tag: string) => {
    setQuery((currentQuery) => {
      const isActive = parseBlogSearchQuery(currentQuery).tagFilters.includes(
        getTagSearchKey(tag),
      );

      return isActive ? removeTagFromQuery(currentQuery, tag) : addTagToQuery(currentQuery, tag);
    });
    setViewMode("browse");
  };

  const handleRemoveTag = (tag: string) => {
    setQuery((currentQuery) => removeTagFromQuery(currentQuery, tag));
  };

  const handleSelectPost = (slug: string) => {
    setSelectedSlug(slug);
    setViewMode("read");
  };

  if (viewMode === "read") {
    return (
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <BlogReader
            onBack={() => setViewMode("browse")}
            onSelectTag={handleToggleTag}
            post={selectedPost}
            projects={projects}
          />
        </div>

        <aside className="xl:sticky xl:top-28 xl:self-start">
          <BlogSeriesSidebar
            onSelectPost={handleSelectPost}
            posts={posts}
            selectedSlug={selectedPost?.slug}
          />
        </aside>
      </div>
    );
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="min-w-0 xl:order-1">
        <BlogPostShowcase
          isSearching={isSearching}
          onSelectPost={handleSelectPost}
          onSelectTag={handleToggleTag}
          posts={displayPosts}
        />
      </div>

      <div className="space-y-5 xl:sticky xl:top-28 xl:order-2 xl:self-start">
        <div>
          <BlogSearchInput
            activeTags={activeTags}
            onClear={() => setQuery("")}
            onQueryChange={setQuery}
            onRemoveTag={handleRemoveTag}
            query={query}
          />
        </div>
        <div>
          <BlogTagFilter
            activeTagKeys={activeTagKeys}
            onSelectTag={handleToggleTag}
            tags={tags}
          />
        </div>
      </div>
    </div>
  );
}
