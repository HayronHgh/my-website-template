import type { Metadata } from "next";
import { DashboardSection } from "@/components/home/dashboard-section";
import { HeroSection } from "@/components/home/hero-section";
import { siteProfile } from "@/data/site";
import { getPublishedProjects } from "@/lib/projects/meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Home",
  description: siteProfile.positioning,
};

export default async function Home() {
  const projects = await getPublishedProjects();

  return (
    <>
      <HeroSection />
      <DashboardSection
        projects={projects.filter((project) => project.group === "featured").slice(0, 3)}
      />
    </>
  );
}
