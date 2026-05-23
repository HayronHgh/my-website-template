import matter from "gray-matter";
import type { ProjectItem } from "@/data/site";
import { getPublishedPosts } from "@/lib/blog";
import { markdownToHtml } from "@/lib/blog/markdown";
import { readTextFileWithMtimeCache } from "@/lib/content/cache";
import {
  getProjectAssetUrl,
  getProjectMarkdownFilePath,
} from "@/lib/projects/assets";
import { getPublishedProjects, getProjectBySlug } from "@/lib/projects/meta";
import { getRelatedPostsForProject } from "@/lib/projects/relations";
import type { BlogPostMeta } from "@/types/blog";

export type ProjectDetail = {
  content: string;
  html: string;
  isTemplate: boolean;
  project: ProjectItem;
  relatedPosts: BlogPostMeta[];
};

export async function getAllProjectSlugs() {
  const projects = await getPublishedProjects();
  return projects.map((project) => project.slug);
}

function createProjectTemplate(project: ProjectItem) {
  return `# ${project.title}

## Problem
Describe the problem this project solves and the original workflow pain.

## My Role
Describe what you built, owned, or intentionally did not own.

## Core Features
List the core user-facing and system-facing features.

## Architecture
Describe the system boundary, data flow, and major modules.

## Tech Stack
Explain the stack and why each major choice was made.

## How to Run
Document local setup or explain why the project is private.

## Demo
Add screenshots, video, or a live demo link.

## Verification
Document tests, benchmark data, usage records, or performance evidence.

## Tradeoffs
Explain the alternatives and why this implementation was chosen.

## Limitations
List what the current version does not handle yet.

## Future Work
Describe the next improvements you would make.`;
}

async function readProjectMarkdown(project: ProjectItem) {
  const filePath = getProjectMarkdownFilePath(project.slug);

  if (!filePath) {
    return {
      isTemplate: true,
      source: createProjectTemplate(project),
    };
  }

  try {
    return {
      isTemplate: false,
      source: await readTextFileWithMtimeCache(filePath),
    };
  } catch {
    return {
      isTemplate: true,
      source: createProjectTemplate(project),
    };
  }
}

export async function getProjectDetailBySlug(slug: string): Promise<ProjectDetail | null> {
  const project = await getProjectBySlug(slug);

  if (!project) {
    return null;
  }

  const [{ isTemplate, source }, posts] = await Promise.all([
    readProjectMarkdown(project),
    getPublishedPosts(),
  ]);
  const { content } = matter(source);
  const html = await markdownToHtml(content, {
    resolveAssetUrl: (assetPath) => getProjectAssetUrl(project.slug, assetPath),
  });

  return {
    content,
    html,
    isTemplate,
    project,
    relatedPosts: getRelatedPostsForProject(project, posts),
  };
}
