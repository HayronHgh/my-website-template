import { NeonButton } from "@/components/ui/neon-button";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { getProjectAssetUrl } from "@/lib/projects/assets";
import { cn } from "@/lib/utils";
import type { ProjectItem } from "@/data/site";

type ProjectCardProps = {
  compact?: boolean;
  project: ProjectItem;
  showLinks?: boolean;
};

const tagClassName =
  "max-w-28 truncate rounded-[3px] border border-[#315467] bg-[#111c2f] px-2 py-1 font-mono text-[11px] font-bold leading-none text-[#b9dfe3]";

export function ProjectCard({ compact, project, showLinks }: ProjectCardProps) {
  const shouldShowLinks = showLinks ?? !compact;
  const coverImageUrl = project.cover.startsWith("generated:")
    ? undefined
    : getProjectAssetUrl(project.slug, project.cover);
  const previewStyle = coverImageUrl
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(15, 23, 42, 0.06), rgba(3, 7, 18, 0.34)), url(${JSON.stringify(coverImageUrl)})`,
        backgroundPosition: project.coverPosition,
        backgroundSize: "cover",
      }
    : { backgroundPosition: project.coverPosition };
  const projectLinks = [
    project.caseStudyUrl
      ? {
          accent: "purple" as const,
          external: false,
          href: project.caseStudyUrl,
          icon: "file" as const,
          label: "Case Study",
        }
      : null,
    project.repoUrl
      ? {
          accent: "purple" as const,
          external: true,
          href: project.repoUrl,
          icon: "github" as const,
          label: "GitHub \u958b\u6e90\u4ee3\u78bc",
        }
      : null,
    project.demoUrl
      ? {
          accent: "amber" as const,
          external: true,
          href: project.demoUrl,
          icon: "projects" as const,
          label: "\u7dda\u4e0a\u5c55\u793a",
        }
      : null,
  ].filter(Boolean);

  return (
    <PixelCard
      accent={project.accent}
      as="article"
      className={cn(
        "group flex h-full flex-col bg-[#0b1220]",
        compact ? "p-3! gap-3" : "gap-5",
      )}
      id={project.slug}
      interactive
    >
      <div
        aria-label={`${project.title} project preview`}
        className={cn(
          `project-preview project-preview-${project.slug}`,
          coverImageUrl && "project-preview-image",
          compact && "project-preview-compact",
          "transition duration-200 group-hover:brightness-110",
        )}
        data-cover={project.cover}
        role="img"
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
      </div>

      <div className={cn("flex flex-1 flex-col", compact ? "gap-2.5" : "gap-4")}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className={cn(
                "truncate font-mono font-bold text-white",
                compact ? "text-lg" : "text-xl",
              )}
            >
              {project.title}
            </h3>
            <p className={cn("mt-1.5 text-sm leading-6 text-slate-300", compact && "clamp-2")}>
              {project.summary}
            </p>
          </div>
          <span className={cn(tagClassName, "max-w-26 shrink-0")}>
            {project.category}
          </span>
        </div>

        {compact ? null : (
          <p className="clamp-3 text-sm leading-6 text-slate-400">{project.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {project.tech.map((tag) => (
            <span className={tagClassName} key={tag} title={tag}>
              {tag}
            </span>
          ))}
        </div>

        {shouldShowLinks ? (
          <div className={cn("mt-auto flex flex-wrap gap-2 pt-1", compact && "pt-0")}>
            {compact && !showLinks ? null : (
              <NeonButton
                accent={project.accent}
                className={
                  compact
                    ? "min-h-9 min-w-0 flex-1 px-3 py-1.5 text-[11px] sm:flex-none"
                    : undefined
                }
                href={project.detailsUrl}
                size="md"
              >
                <PixelIcon className="h-4 w-4" name="projects" />
                <span className="truncate">View Details</span>
              </NeonButton>
            )}
            {projectLinks.map((link) =>
              link ? (
                <NeonButton
                  accent={link.accent}
                  className={
                    compact
                      ? "min-h-9 min-w-0 flex-1 px-3 py-1.5 text-[11px] sm:flex-none"
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
