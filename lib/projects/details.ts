import { promises as fs } from "node:fs";
import matter from "gray-matter";
import type { ProjectItem } from "@/data/site";
import { getPublishedPosts } from "@/lib/blog";
import { markdownToHtml } from "@/lib/blog/markdown";
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
這個專案解決什麼問題？原本流程痛點是什麼？

## My Role
我負責哪些部分？哪些不是我做的？

## Core Features
核心功能列表。

## Architecture
系統架構圖與資料流。

## Tech Stack
技術棧與選用理由。

## How to Run
如何本地啟動。

## Demo
截圖、影片、live demo。

## Verification
測試、benchmark、實際資料量、使用紀錄、效能數據。

## Tradeoffs
做了哪些取捨？為什麼？

## Limitations
目前還不能做什麼？

## Future Work
下一步會怎麼改。
`;
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
      source: await fs.readFile(filePath, "utf8"),
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
