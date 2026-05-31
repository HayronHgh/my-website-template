import type { Metadata } from "next";
import { BlogSearchApp } from "@/components/blog/blog-search-app";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { getHashtagIndex, getPublishedPosts } from "@/lib/blog";
import { getPublishedProjects } from "@/lib/projects/meta";
import { getSiteSettings } from "@/lib/site/settings";
import type { BlogTagOption } from "@/types/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Searchable engineering notes with local markdown posts, hashtags, and a same-page reader.",
};

const toTagOptions = (hashtagIndex: Awaited<ReturnType<typeof getHashtagIndex>>) =>
  Object.entries(hashtagIndex)
    .map<BlogTagOption>(([tag, posts]) => ({
      tag,
      count: posts.length,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.tag.localeCompare(right.tag);
    });

export default async function BlogPage() {
  const [posts, hashtagIndex, projects, siteSettings] = await Promise.all([
    getPublishedPosts(),
    getHashtagIndex(),
    getPublishedProjects(),
    getSiteSettings(),
  ]);

  return (
    <Section className="!pt-0 sm:!pt-0">
      <PageHero
        accent="purple"
        artClassName="page-hero-art-blog"
        background={siteSettings.pageImages.blogHero.src}
        description="A local markdown workspace for notes, case studies, and implementation writeups."
        icon="file"
        imagePosition={siteSettings.pageImages.blogHero.position}
        title="Blog Signals"
      />

      <Container className="mt-5">
        <BlogSearchApp posts={posts} projects={projects} tags={toTagOptions(hashtagIndex)} />
      </Container>
    </Section>
  );
}
