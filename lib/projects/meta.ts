import { promises as fs } from "node:fs";
import path from "node:path";
import { readTextFileWithMtimeCache } from "@/lib/content/cache";
import { PROJECT_CONTENT_DIRECTORY } from "@/lib/projects/constants";
import { getProjectMetaFilePath, getProjectSlugSegments } from "@/lib/projects/assets";
import type {
  Accent,
  ProjectGroup,
  ProjectItem,
  ProjectMaturity,
} from "@/data/site";

type ProjectMetaSource = Partial<ProjectItem> & {
  accent?: string;
  group?: string;
  maturity?: string;
};

const groupRank: Record<ProjectGroup, number> = {
  featured: 0,
  systems: 1,
  experiments: 2,
};

const accentValues = new Set<Accent>(["cyan", "blue", "purple", "pink", "amber", "green"]);
const groupValues = new Set<ProjectGroup>(["featured", "systems", "experiments"]);
const maturityValues = new Set<ProjectMaturity>([
  "Production",
  "Case Study",
  "Capstone",
  "Prototype",
  "Research",
  "Learning Archive",
]);

function toNonEmptyString(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : fallback;
}

function toOptionalString(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : undefined;
}

function toBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function toOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsedValue = Number(value.trim());
    return Number.isFinite(parsedValue) ? parsedValue : undefined;
  }

  return undefined;
}

function toStringArray(value: unknown) {
  const dedupe = (entries: string[]) => [...new Set(entries)];

  if (Array.isArray(value)) {
    return dedupe(
      value
        .filter((entry): entry is string => typeof entry === "string")
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
  }

  if (typeof value === "string") {
    return dedupe(
      value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
    );
  }

  return [];
}

function toAccent(value: unknown, fallback: Accent): Accent {
  return typeof value === "string" && accentValues.has(value as Accent)
    ? (value as Accent)
    : fallback;
}

function toProjectGroup(value: unknown) {
  return typeof value === "string" && groupValues.has(value as ProjectGroup)
    ? (value as ProjectGroup)
    : undefined;
}

function toProjectMaturity(value: unknown) {
  return typeof value === "string" && maturityValues.has(value as ProjectMaturity)
    ? (value as ProjectMaturity)
    : undefined;
}

function createFallbackTitle(slug: string) {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeProjectMeta(slug: string, source: ProjectMetaSource): ProjectItem {
  const title = toNonEmptyString(source.title, createFallbackTitle(slug));
  const tech = toStringArray(source.tech);

  return {
    slug,
    title,
    category: toNonEmptyString(source.category, "Project"),
    summary: toNonEmptyString(source.summary, "Project summary pending."),
    description: toNonEmptyString(source.description, source.summary ?? "Project details pending."),
    tech,
    cover: toNonEmptyString(source.cover, `generated:${slug}`),
    coverPosition: toNonEmptyString(source.coverPosition, "center center"),
    accent: toAccent(source.accent, "cyan"),
    detailsUrl: toNonEmptyString(source.detailsUrl, `/projects/${slug}`),
    caseStudyUrl: toOptionalString(source.caseStudyUrl),
    demoUrl: toOptionalString(source.demoUrl),
    group: toProjectGroup(source.group),
    maturity: toProjectMaturity(source.maturity),
    order: toOptionalNumber(source.order),
    outcomes: toStringArray(source.outcomes),
    privateCase: toBoolean(source.privateCase, false),
    published: toBoolean(source.published, true),
    publicBoundary: toOptionalString(source.publicBoundary),
    relatedTags: toStringArray(source.relatedTags),
    repoUrl: toOptionalString(source.repoUrl),
    scope: toOptionalString(source.scope),
    year: toOptionalString(source.year),
  };
}

async function getProjectDirectoryNames() {
  try {
    const entries = await fs.readdir(PROJECT_CONTENT_DIRECTORY, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((slug) => getProjectSlugSegments(slug));
  } catch {
    return [];
  }
}

async function readProjectMetaBySlug(slug: string) {
  const filePath = getProjectMetaFilePath(slug);

  if (!filePath) {
    return null;
  }

  try {
    const source = await readTextFileWithMtimeCache(filePath);
    const parsedSource = JSON.parse(source) as ProjectMetaSource;
    return normalizeProjectMeta(slug, parsedSource);
  } catch {
    return null;
  }
}

export async function getAllProjects() {
  const slugs = await getProjectDirectoryNames();
  const projects = await Promise.all(slugs.map((slug) => readProjectMetaBySlug(slug)));

  return projects
    .filter((project): project is ProjectItem => Boolean(project))
    .sort((left, right) => {
      const leftGroupRank = left.group ? groupRank[left.group] : Number.POSITIVE_INFINITY;
      const rightGroupRank = right.group ? groupRank[right.group] : Number.POSITIVE_INFINITY;

      if (leftGroupRank !== rightGroupRank) {
        return leftGroupRank - rightGroupRank;
      }

      const leftOrder = left.order ?? Number.POSITIVE_INFINITY;
      const rightOrder = right.order ?? Number.POSITIVE_INFINITY;

      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return left.title.localeCompare(right.title);
    });
}

export async function getPublishedProjects() {
  const projects = await getAllProjects();
  return projects.filter((project) => project.published !== false);
}

export async function getProjectBySlug(slug: string) {
  const slugSegments = getProjectSlugSegments(slug);

  if (!slugSegments) {
    return null;
  }

  const project = await readProjectMetaBySlug(slugSegments[0]);
  return project?.published === false ? null : project;
}

export function getProjectContentPathForDisplay(slug: string) {
  return path.join("content", "projects", slug);
}
