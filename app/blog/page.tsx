import type { Metadata } from "next";
import { BlogSearchApp } from "@/components/blog/blog-search-app";
import { Container } from "@/components/ui/container";
import { PageHero } from "@/components/ui/page-hero";
import { Section } from "@/components/ui/section";
import { createBlogListingFromPosts } from "@/lib/blog";
import { getPublishedPostListItems } from "@/lib/blog/posts";
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
  const [posts, projects, siteSettings] = await Promise.all([
    getPublishedPostListItems(),
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

      <Container className="mt-5">
        <BlogSearchApp
          copy={siteSettings.pages.blog}
          initialListing={initialListing}
          projects={projects}
          tags={toTagOptions(hashtagIndex)}
        />
      </Container>
    </Section>
  );
}
