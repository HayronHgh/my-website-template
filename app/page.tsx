import type { Metadata } from "next";
import { DashboardSection } from "@/components/home/dashboard-section";
import { HeroSection } from "@/components/home/hero-section";
import { getPublishedProjects } from "@/lib/projects/meta";
import { getSiteSettings } from "@/lib/site/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { siteProfile } = await getSiteSettings();

  return {
    title: "Home",
    description: siteProfile.positioning,
  };
}

export default async function Home() {
  const [projects, siteSettings] = await Promise.all([
    getPublishedProjects(),
    getSiteSettings(),
  ]);

  return (
    <>
      <HeroSection
        homePageData={siteSettings.homePageData}
        pageImages={siteSettings.pageImages}
        siteProfile={siteSettings.siteProfile}
      />
      <DashboardSection
        contactLinks={siteSettings.contactLinks}
        homePageData={siteSettings.homePageData}
        projects={projects.filter((project) => project.group === "featured").slice(0, 3)}
        siteProfile={siteSettings.siteProfile}
      />
    </>
  );
}
