import type { Metadata } from "next";
import { BlogSearchApp } from "@/components/blog/blog-search-app";
import { ProblemList } from "@/components/leetcode/problem-list";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/ui/page-hero";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { Section } from "@/components/ui/section";
import { createBlogListingFromPosts } from "@/lib/blog";
import { getPublishedPostListItems } from "@/lib/blog/posts";
import { getPublishedProblems } from "@/lib/leetcode/public";
import { getPublishedProjects } from "@/lib/projects/meta";
import { getSiteSettings } from "@/lib/site/settings";
import type { BlogHashtagIndex, BlogPostListItem, BlogTagOption } from "@/types/blog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getSiteSettings();

  return {
    title: pages.blog.metadata.title,
    description: pages.blog.metadata.description,
    alternates: { canonical: "/articles" },
  };
}

const createHashtagIndexFromPosts = (posts: BlogPostListItem[]) =>
  posts.reduce<BlogHashtagIndex>((index, post) => {
    post.tags.forEach((tag) => {
      index[tag] = [...(index[tag] ?? []), post];
    });

    return index;
  }, {});

const toTagOptions = (hashtagIndex: BlogHashtagIndex) =>
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
  const [posts, problems, projects, siteSettings] = await Promise.all([
    getPublishedPostListItems(),
    getPublishedProblems(),
    getPublishedProjects(),
    getSiteSettings(),
  ]);
  const initialListing = createBlogListingFromPosts(posts);
  const hashtagIndex = createHashtagIndexFromPosts(posts);

  return (
    <Section className="!pt-0 sm:!pt-0">
      <PageHero
        accent="purple"
        artClassName="page-hero-art-blog"
        background={siteSettings.pageImages.blogHero.src}
        description={siteSettings.pages.blog.hero.description}
        icon="file"
        imagePosition={siteSettings.pageImages.blogHero.position}
        title={siteSettings.pages.blog.hero.title}
      />

      <Container className="mt-5 space-y-5">
        <BlogSearchApp
          copy={siteSettings.pages.blog}
          initialListing={initialListing}
          projects={projects}
          tags={toTagOptions(hashtagIndex)}
        />

        <section className="scroll-mt-24 space-y-4" id="algorithm-practice">
          <PixelCard accent="amber" className="p-4! sm:p-5!">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div className="max-w-3xl">
                <div className="flex items-center gap-2 text-amber-200">
                  <PixelIcon className="h-4 w-4" name="skills" />
                  <p className="font-mono text-[11px] font-black uppercase tracking-[0.16em]">
                    Learning archive
                  </p>
                </div>
                <h2 className="mt-2 font-mono text-2xl font-black text-white">
                  Algorithm Practice
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#b7c2d8]">
                  LeetCode 題解是工程筆記的一部分：記錄問題拆解、解法正確性、複雜度與複習狀態，不再作為獨立主站分區。
                </p>
              </div>

              <dl className="grid grid-cols-3 gap-2 sm:min-w-72">
                {[
                  ["Published", problems.length],
                  ["Solved", problems.filter((problem) => problem.problem?.status === "Solved").length],
                  ["Notes", problems.filter((problem) => problem.problem?.entryType === "note").length],
                ].map(([label, value]) => (
                  <div className="flex flex-col rounded-[4px] border border-amber-200/15 bg-[#101827] px-2 py-3 text-center" key={label}>
                    <dt className="order-2 mt-1 font-mono text-[9px] uppercase tracking-wide text-[#9fb0d8]">{label}</dt>
                    <dd className="order-1 font-mono text-lg font-black text-amber-100">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </PixelCard>

          <ProblemList
            problems={problems.map((problem) => ({
              ...problem.problem!,
              slug: problem.slug,
              summary: problem.description,
              tags: problem.tags,
              title: problem.title,
            }))}
          />
        </section>
      </Container>
    </Section>
  );
}
