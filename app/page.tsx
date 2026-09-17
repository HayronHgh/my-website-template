import type { Metadata } from "next";
import { DashboardSection } from "@/components/home/dashboard-section";
import { HeroSection } from "@/components/home/hero-section";
import { getPublishedProjects } from "@/lib/projects/meta";
import { getSiteSettings } from "@/lib/site/settings";
import { getPublishedPostListItems } from "@/lib/blog/posts";
import { getBlogArticlePath } from "@/lib/blog/slug";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { pages } = await getSiteSettings();

  return {
    title: pages.home.metadata.title,
    description: pages.home.metadata.description,
  };
}

export default async function Home() {
  const articles = (await getPublishedPostListItems()).slice(0, 3);
  const [projects, siteSettings] = await Promise.all([
    getPublishedProjects(),
    getSiteSettings(),
  ]);

  return (
    <>
      <HeroSection
        actions={siteSettings.pages.home.heroActions}
        homePageData={siteSettings.homePageData}
        pageImages={siteSettings.pageImages}
        siteProfile={siteSettings.siteProfile}
      />
      <DashboardSection
        blogCardReadLabel={siteSettings.pages.blog.card.readLabel}
        contactLinks={siteSettings.contactLinks}
        copy={siteSettings.pages.home.dashboard}
        homePageData={{ ...siteSettings.homePageData, articles: articles.map((article) => ({
          slug: article.slug, title: article.title, date: article.date,
          category: article.tags[0] ?? "Article", excerpt: article.summary,
          href: getBlogArticlePath(article.slug),
        })) }}
        projectCardLabels={siteSettings.pages.projectCard}
        projects={projects.filter((project) => project.group === "featured").slice(0, 3)}
        siteProfile={siteSettings.siteProfile}
        timelineCopy={siteSettings.pages.home.timeline}
      />
    </>
  );
}
