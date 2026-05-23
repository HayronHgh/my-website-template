import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { ui } from "@/components/ui/pixel-theme";
import { absoluteUrl } from "@/lib/env";
import { getPostBySlug, getPublishedPosts } from "@/lib/blog";
import { getPublishedProjects } from "@/lib/projects/meta";
import { getRelatedProjectsForPost } from "@/lib/projects/relations";
import { formatDate } from "@/lib/utils";

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
  const post = await getPostBySlug(slug);

  if (!post || !post.published) {
    return {
      title: "Post not found",
    };
  }

  return {
    title: post.title,
    description: post.summary,
    alternates: {
      canonical: `/blog/${post.slug}`,
    },
    openGraph: {
      title: post.title,
      description: post.summary,
      type: "article",
      url: absoluteUrl(`/blog/${post.slug}`),
      publishedTime: post.date,
      tags: post.tags,
      images: post.coverImage ? [post.coverImage] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug: slugSegments } = await params;
  const slug = getSlug(slugSegments);
  const [post, posts, projects] = await Promise.all([
    getPostBySlug(slug),
    getPublishedPosts(),
    getPublishedProjects(),
  ]);

  if (!post || !post.published) {
    notFound();
  }

  const seriesPosts = posts.filter((candidate) =>
    post.series
      ? candidate.series?.slug === post.series.slug
      : !candidate.series,
  );
  const relatedProjects = getRelatedProjectsForPost(post, projects, 4);

  return (
    <Section>
      <Container>
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <article className="min-w-0 space-y-5">
            <header className="space-y-5">
              <div className="flex flex-wrap gap-3">
                {post.tags.map((tag) => (
                  <span
                    className={ui.tinyTag}
                    key={tag}
                  >
                    #{tag}
                  </span>
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
                <h1 className="font-mono text-4xl font-black leading-[1.15] text-white sm:text-5xl">
                  {post.title}
                </h1>
                <p className="text-lg leading-8 text-slate-300">{post.summary}</p>
              </div>

              {post.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="max-h-96 w-full rounded-[5px] border border-[#26344d] object-cover"
                  src={post.coverImage}
                />
              ) : null}
            </header>

            <PixelCard accent="purple">
              <div
                className="prose-content"
                dangerouslySetInnerHTML={{ __html: post.html }}
              />
            </PixelCard>
          </article>

          <aside className="xl:sticky xl:top-28 xl:self-start">
            <PixelCard accent="cyan" className="space-y-3">
              <h2 className="font-mono text-base font-bold text-white">
                {post.series?.title ?? "Standalone"}
              </h2>
              <div className="space-y-2">
                {seriesPosts.map((seriesPost) => (
                  <a
                    className={
                      seriesPost.slug === post.slug
                        ? "block rounded-[4px] border border-[#6ea8b0] bg-[#151e2f] p-3 font-mono text-sm text-[#b9dfe3] shadow-[inset_0_0_0_1px_#1c2b43]"
                        : "block rounded-[4px] border border-[#26344d] bg-[#101827] p-3 font-mono text-sm text-slate-300 transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] hover:text-white"
                    }
                    href={`/blog/${seriesPost.slug}`}
                    key={seriesPost.slug}
                  >
                    {seriesPost.title}
                  </a>
                ))}
              </div>
            </PixelCard>

            {relatedProjects.length ? (
              <PixelCard accent="purple" className="mt-5 space-y-3">
                <div className="flex items-center gap-2 font-mono text-base font-bold text-white">
                  <PixelIcon className="h-5 w-5" name="projects" />
                  Related Projects
                </div>
                <div className="space-y-2">
                  {relatedProjects.map((project) => (
                    <a
                      className="block rounded-[4px] border border-[#26344d] bg-[#101827] p-3 transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
                      href={project.detailsUrl}
                      key={project.slug}
                    >
                      <p className="clamp-2 font-mono text-sm font-bold leading-6 text-[#eef3ff]">
                        {project.title}
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-[#7f8db3]">
                        {project.category}
                      </p>
                    </a>
                  ))}
                </div>
              </PixelCard>
            ) : null}
          </aside>
        </div>
      </Container>
    </Section>
  );
}
