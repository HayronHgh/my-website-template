import { BackControl } from "@/components/ui/back-control";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getMigratedProblemPath } from "@/lib/leetcode/redirects";
import { ArticleHeader } from "@/components/blog/article-header";
import { MarkdownCopyButtons } from "@/components/blog/markdown-copy-buttons";
import { BlogSeriesSidebar } from "@/components/blog/blog-series-sidebar";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PixelCard } from "@/components/ui/pixel-card";
import { getPostBySlug, getPublishedPostListItems } from "@/lib/blog";
import { getBlogArticlePath } from "@/lib/blog/slug";
import { getPublishedProjects } from "@/lib/projects/meta";
import { getRelatedProjectsForPost } from "@/lib/projects/relations";
import { getSiteSettings } from "@/lib/site/settings";

type BlogPostPageProps = {
  params: Promise<{
    slug: string[];
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const getSlug = (segments: string[]) => segments.join("/");

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug: slugSegments } = await params;
  const slug = getSlug(slugSegments);
  const migratedPath = await getMigratedProblemPath(slug);
  if (migratedPath) permanentRedirect(migratedPath);
  const [post, siteSettings] = await Promise.all([
    getPostBySlug(slug),
    getSiteSettings(),
  ]);

  if (!post || !post.published) {
    return {
      title: siteSettings.pages.blog.metadata.title,
    };
  }

  const articlePath = getBlogArticlePath(post.slug);

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: articlePath,
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      url: new URL(articlePath, `${siteSettings.siteUrl}/`).toString(),
      publishedTime: post.date,
      tags: post.tags,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug: slugSegments } = await params;
  const slug = getSlug(slugSegments);
  const migratedPath = await getMigratedProblemPath(slug);
  if (migratedPath) permanentRedirect(migratedPath);
  const [post, posts, projects, siteSettings] = await Promise.all([
    getPostBySlug(slug),
    getPublishedPostListItems(),
    getPublishedProjects(),
    getSiteSettings(),
  ]);

  if (!post || !post.published) {
    notFound();
  }

  const relatedProjects = getRelatedProjectsForPost(post, projects, 3);
  const pageCopy = siteSettings.pages.blog;
  const selectedPostMeta = posts.find((candidate) => candidate.slug === post.slug) ?? {
    coverImage: post.coverImage,
    date: post.date,
    featuredRank: post.featuredRank,
    order: post.order,
    pathSegments: post.pathSegments,
    published: post.published,
    relatedProjects: post.relatedProjects,
    series: post.series,
    slug: post.slug,
    summary: post.summary,
    tags: post.tags,
    title: post.title,
  };

  return (
    <Section>
      <Container>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <PixelCard accent="purple" as="article" className="article-reader">
              <ArticleHeader
                back={<BackControl href="/articles" />}
                post={post}
                readTimeMinutes={"readTimeMinutes" in selectedPostMeta ? selectedPostMeta.readTimeMinutes : undefined}
                relatedProjectLabel={pageCopy.reader.relatedProjectLabel}
                relatedProjects={relatedProjects}
              />

              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
              <MarkdownCopyButtons />
            </PixelCard>
          </div>

          <aside className="xl:sticky xl:top-28 xl:self-start">
            <BlogSeriesSidebar
              copy={pageCopy.series}
              initialPostsComplete
              posts={posts}
              selectedPost={selectedPostMeta}
              selectedSlug={post.slug}
            />
          </aside>
        </div>
      </Container>
    </Section>
  );
}
