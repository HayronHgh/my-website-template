import Link from "next/link";
import { NeonButton } from "@/components/ui/neon-button";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { getProjectAssetUrl } from "@/lib/projects/assets";
import { getProjectCoverStyle } from "@/lib/projects/cover-style";
import { cn } from "@/lib/utils";
import type { ProjectItem } from "@/data/site";
import type { ProjectCardLabels } from "@/lib/site/settings";

type ProjectCardProps = {
  compact?: boolean;
  labels?: ProjectCardLabels;
  project: ProjectItem;
  showLinks?: boolean;
};

const tagClassName =
  "max-w-32 truncate border border-[#26344d] px-2 py-1 font-mono text-xs leading-none text-[#a9bccf]";

const defaultLabels: ProjectCardLabels = {
  caseStudy: "Case Study",
  demo: "Live Demo",
  details: "View Details",
  repository: "GitHub",
};

export function ProjectCard({
  compact,
  labels = defaultLabels,
  project,
  showLinks,
}: ProjectCardProps) {
  const shouldShowLinks = showLinks ?? !compact;
  const coverImageUrl = project.cover.startsWith("generated:")
    ? undefined
    : getProjectAssetUrl(project.slug, project.cover);
  const previewStyle = getProjectCoverStyle(coverImageUrl, project.coverPosition);
  const projectLinks = [
    project.caseStudyUrl
      ? {
          accent: "purple" as const,
          external: false,
          href: project.caseStudyUrl,
          icon: "file" as const,
          label: labels.caseStudy,
        }
      : null,
    project.repoUrl
      ? {
          accent: "purple" as const,
          external: true,
          href: project.repoUrl,
          icon: "github" as const,
          label: labels.repository,
        }
      : null,
    project.demoUrl
      ? {
          accent: "amber" as const,
          external: true,
          href: project.demoUrl,
          icon: "projects" as const,
          label: labels.demo,
        }
      : null,
  ].filter(Boolean);

  return (
    <PixelCard
      accent={project.accent}
      as="article"
      className={cn(
        "project-card group flex h-full flex-col bg-[#0b1220]",
        compact ? "p-3! gap-3" : "gap-5",
      )}
      id={project.slug}
      interactive
    >
      <Link href={project.detailsUrl}
        aria-label={`${project.title} project preview`}
        className={cn(
          `project-preview project-preview-${project.slug}`,
          coverImageUrl && "project-preview-image",
          compact && "project-preview-compact",
          "transition duration-200",
          !coverImageUrl && "group-hover:brightness-110",
        )}
        data-cover={project.cover}
        style={previewStyle}
      >
        <div className="preview-toolbar">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-grid">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
      </Link>

      <div className={cn("flex flex-1 flex-col", compact ? "gap-2.5" : "gap-4")}>
        <div className="project-card-heading">
          <div className="min-w-0">
            <h3
              className={cn(
                "project-card-title font-heading font-extrabold text-white",
                compact ? "text-lg" : "text-xl",
              )}
            >
              <Link href={project.detailsUrl}>{project.title}</Link>
            </h3>
            <p className={cn("mt-1.5 text-sm leading-6 text-slate-300", compact && "clamp-2")}>
              {project.summary}
            </p>
          </div>
          <span className="project-card-category" data-glow={project.accent}>
            {project.category}
          </span>
        </div>

        {compact ? null : (
          <p className="clamp-3 text-sm leading-6 text-slate-400">{project.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {(compact ? project.tech.slice(0, 3) : project.tech).map((tag) => (
            <span className={tagClassName} key={tag} title={tag}>
              {tag}
            </span>
          ))}
          {compact && project.tech.length > 3 ? (
            <span className={tagClassName} title={project.tech.slice(3).join(", ")}>
              +{project.tech.length - 3}
            </span>
          ) : null}
        </div>

        {shouldShowLinks ? (
          <div className={cn("mt-auto flex flex-wrap gap-2 pt-1", compact && "pt-0")}>
            {compact && !showLinks ? null : (
              <NeonButton
                accent={project.accent}
                className={
                  compact
                    ? "min-h-9 min-w-0 flex-1 px-3 py-1.5 text-xs sm:flex-none"
                    : undefined
                }
                href={project.detailsUrl}
                size="md"
              >
                <PixelIcon className="h-4 w-4" name="projects" />
                <span className="truncate">{labels.details}</span>
              </NeonButton>
            )}
            {projectLinks.map((link) =>
              link ? (
                <NeonButton
                  accent={link.accent}
                  className={
                    compact
                      ? "min-h-9 min-w-0 flex-1 px-3 py-1.5 text-xs sm:flex-none"
                      : undefined
                  }
                  external={link.external}
                  href={link.href}
                  key={link.label}
                  size="md"
                  variant="secondary"
                >
                  <PixelIcon className="h-4 w-4" name={link.icon} />
                  <span className="truncate">{link.label}</span>
                </NeonButton>
              ) : null,
            )}
          </div>
        ) : null}
      </div>
    </PixelCard>
  );
}
