import { ProjectCard } from "@/components/projects/project-card";
import { NeonButton } from "@/components/ui/neon-button";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { SectionTitle } from "@/components/ui/section-title";
import { Container } from "@/components/ui/container";
import { getPublishedProjects } from "@/lib/projects/meta";

export async function FeaturedProjectsSection() {
  const projects = await getPublishedProjects();
  const featuredProjects = projects.filter((project) => project.group === "featured").slice(0, 3);

  return (
    <section className="py-14 sm:py-20">
      <Container>
        <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <SectionTitle
            accent="amber"
            description="Selected builds with consistent cover frames, metadata, and pixel-style tags."
            eyebrow="Featured Projects"
            icon={<PixelIcon className="h-5 w-5" name="star" />}
            title="Selected builds from the neon lab."
          />
          <NeonButton accent="amber" href="/projects" variant="secondary">
            View all
          </NeonButton>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {featuredProjects.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </div>
      </Container>
    </section>
  );
}
