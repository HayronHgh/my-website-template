import { promises as fs } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import { z } from "zod";
import { stripByteOrderMark } from "./cache";
import { isSafeMarkdownUrl } from "./url-policy";

const PROJECT_GROUPS = ["featured", "systems", "experiments"] as const;
const PROJECT_MATURITIES = [
  "Production",
  "Case Study",
  "Capstone",
  "Prototype",
  "Research",
  "Learning Archive",
] as const;
const ACCENTS = ["cyan", "blue", "purple", "pink", "amber", "green"] as const;
const SINGLE_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BLOG_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type ContentValidationIssue = {
  filePath: string;
  message: string;
};

export type ContentValidationResult = {
  blogPosts: number;
  issues: ContentValidationIssue[];
  projects: number;
};

type MarkdownNode = {
  type?: unknown;
  url?: unknown;
  children?: unknown;
};

const stringArraySchema = z
  .array(z.string().trim().min(1))
  .default([]);

const projectMetaSchema = z.object({
  slug: z.string().regex(SINGLE_SLUG_PATTERN),
  title: z.string().trim().min(1),
  category: z.string().trim().min(1),
  summary: z.string().trim().min(1),
  description: z.string().trim().min(1),
  tech: stringArraySchema,
  cover: z.string().trim().min(1),
  coverPosition: z.string().trim().min(1).optional(),
  accent: z.enum(ACCENTS),
  detailsUrl: z.string().trim().min(1),
  caseStudyUrl: z.string().trim().min(1).optional(),
  demoUrl: z.string().trim().min(1).optional(),
  group: z.enum(PROJECT_GROUPS).optional(),
  maturity: z.enum(PROJECT_MATURITIES).optional(),
  order: z.coerce.number().finite().optional(),
  outcomes: stringArraySchema.optional(),
  privateCase: z.boolean().optional(),
  published: z.boolean().optional(),
  publicBoundary: z.string().trim().min(1).optional(),
  relatedTags: stringArraySchema.optional(),
  repoUrl: z.string().trim().min(1).optional(),
  scope: z.string().trim().min(1).optional(),
  year: z.string().trim().min(1).optional(),
}).passthrough();

const blogFrontmatterSchema = z.object({
  title: z.string().trim().min(1),
  date: z.preprocess(
    (value) => value instanceof Date ? value.toISOString().slice(0, 10) : value,
    z.string().regex(BLOG_DATE_PATTERN),
  ),
  summary: z.string().trim().min(1),
  tags: stringArraySchema.optional(),
  published: z.boolean().optional(),
  coverImage: z.string().trim().min(1).optional(),
  featuredRank: z.coerce.number().finite().optional(),
  relatedProjects: stringArraySchema.optional(),
  series: z.string().trim().min(1).optional(),
}).passthrough();

function toDisplayPath(rootDirectory: string, filePath: string) {
  return path.relative(rootDirectory, filePath).split(path.sep).join("/");
}

function addZodIssues(
  issues: ContentValidationIssue[],
  rootDirectory: string,
  filePath: string,
  error: z.ZodError,
) {
  const displayPath = toDisplayPath(rootDirectory, filePath);

  error.issues.forEach((issue) => {
    const fieldPath = issue.path.length ? `${issue.path.join(".")}: ` : "";
    issues.push({
      filePath: displayPath,
      message: `${fieldPath}${issue.message}`,
    });
  });
}

async function pathExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getDirectoryNames(directory: string) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  } catch {
    return [];
  }
}

async function findBlogPostFiles(directory: string): Promise<string[]> {
  let entries;

  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files: string[] = [];

  if (entries.some((entry) => entry.isFile() && entry.name === "main.md")) {
    files.push(path.join(directory, "main.md"));
  }

  const childFiles = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => findBlogPostFiles(path.join(directory, entry.name))),
  );

  return [...files, ...childFiles.flat()];
}

function isSafePublicOrRemoteImage(value: string) {
  if (value.startsWith("generated:")) {
    return true;
  }

  return isSafeMarkdownUrl(value, "image");
}

function visitMarkdownNodes(node: unknown, visitor: (node: MarkdownNode) => void) {
  if (!node || typeof node !== "object") {
    return;
  }

  const markdownNode = node as MarkdownNode;
  visitor(markdownNode);

  if (Array.isArray(markdownNode.children)) {
    markdownNode.children.forEach((child) => visitMarkdownNodes(child, visitor));
  }
}

function validateMarkdownUrls(
  markdown: string,
  filePath: string,
  rootDirectory: string,
  issues: ContentValidationIssue[],
) {
  const tree = remark().parse(markdown);
  const displayPath = toDisplayPath(rootDirectory, filePath);

  visitMarkdownNodes(tree, (node) => {
    if ((node.type === "link" || node.type === "image") && typeof node.url === "string") {
      const kind = node.type === "image" ? "image" : "link";

      if (!isSafeMarkdownUrl(node.url, kind)) {
        issues.push({
          filePath: displayPath,
          message: `${kind} URL is not allowed: ${node.url}`,
        });
      }
    }
  });
}

async function validateProjects(
  rootDirectory: string,
  projectDirectory: string,
  issues: ContentValidationIssue[],
) {
  const projectSlugs = await getDirectoryNames(projectDirectory);
  let projectCount = 0;

  for (const folderSlug of projectSlugs) {
    const displayDirectory = toDisplayPath(rootDirectory, path.join(projectDirectory, folderSlug));
    const metaPath = path.join(projectDirectory, folderSlug, "meta.json");
    const markdownPath = path.join(projectDirectory, folderSlug, "main.md");

    if (!SINGLE_SLUG_PATTERN.test(folderSlug)) {
      issues.push({
        filePath: displayDirectory,
        message: "Project folder name must be a URL-safe kebab-case slug.",
      });
      continue;
    }

    if (!(await pathExists(metaPath))) {
      issues.push({ filePath: displayDirectory, message: "Missing meta.json." });
      continue;
    }

    projectCount += 1;

    let rawMeta: unknown;
    try {
      rawMeta = JSON.parse(stripByteOrderMark(await fs.readFile(metaPath, "utf8")));
    } catch (error) {
      issues.push({
        filePath: toDisplayPath(rootDirectory, metaPath),
        message: `Invalid JSON: ${error instanceof Error ? error.message : "unknown error"}`,
      });
      continue;
    }

    const parsedMeta = projectMetaSchema.safeParse(rawMeta);

    if (!parsedMeta.success) {
      addZodIssues(issues, rootDirectory, metaPath, parsedMeta.error);
      continue;
    }

    const meta = parsedMeta.data;

    if (meta.slug !== folderSlug) {
      issues.push({
        filePath: toDisplayPath(rootDirectory, metaPath),
        message: `slug must match folder name "${folderSlug}".`,
      });
    }

    if (meta.detailsUrl !== `/projects/${folderSlug}`) {
      issues.push({
        filePath: toDisplayPath(rootDirectory, metaPath),
        message: `detailsUrl must be "/projects/${folderSlug}".`,
      });
    }

    if (!isSafePublicOrRemoteImage(meta.cover)) {
      issues.push({
        filePath: toDisplayPath(rootDirectory, metaPath),
        message: `cover path is not allowed: ${meta.cover}`,
      });
    }

    if (!(await pathExists(markdownPath))) {
      issues.push({
        filePath: displayDirectory,
        message: "Missing main.md.",
      });
    } else {
      validateMarkdownUrls(
        stripByteOrderMark(await fs.readFile(markdownPath, "utf8")),
        markdownPath,
        rootDirectory,
        issues,
      );
    }
  }

  return {
    projectCount,
    projectSlugs: new Set(projectSlugs),
  };
}

async function validateBlogPosts(
  rootDirectory: string,
  blogDirectory: string,
  projectSlugs: Set<string>,
  issues: ContentValidationIssue[],
) {
  const postFiles = await findBlogPostFiles(blogDirectory);

  for (const filePath of postFiles) {
    const source = stripByteOrderMark(await fs.readFile(filePath, "utf8"));
    const { data, content } = matter(source);
    const parsedFrontmatter = blogFrontmatterSchema.safeParse(data);

    if (!parsedFrontmatter.success) {
      addZodIssues(issues, rootDirectory, filePath, parsedFrontmatter.error);
    } else {
      const meta = parsedFrontmatter.data;

      if (meta.coverImage && !isSafePublicOrRemoteImage(meta.coverImage)) {
        issues.push({
          filePath: toDisplayPath(rootDirectory, filePath),
          message: `coverImage path is not allowed: ${meta.coverImage}`,
        });
      }

      meta.relatedProjects?.forEach((slug) => {
        if (!projectSlugs.has(slug)) {
          issues.push({
            filePath: toDisplayPath(rootDirectory, filePath),
            message: `relatedProjects references missing project "${slug}".`,
          });
        }
      });
    }

    validateMarkdownUrls(source, filePath, rootDirectory, issues);

    if (!content.trim()) {
      issues.push({
        filePath: toDisplayPath(rootDirectory, filePath),
        message: "Blog post body is empty.",
      });
    }
  }

  return postFiles.length;
}

export async function validateContent(rootDirectory = process.cwd()): Promise<ContentValidationResult> {
  const issues: ContentValidationIssue[] = [];
  const contentDirectory = path.join(rootDirectory, "content");
  const projectDirectory = path.join(contentDirectory, "projects");
  const blogDirectory = path.join(contentDirectory, "blog");

  const { projectCount, projectSlugs } = await validateProjects(
    rootDirectory,
    projectDirectory,
    issues,
  );
  const blogPostCount = await validateBlogPosts(
    rootDirectory,
    blogDirectory,
    projectSlugs,
    issues,
  );

  return {
    blogPosts: blogPostCount,
    issues,
    projects: projectCount,
  };
}

export function formatContentValidationResult(result: ContentValidationResult) {
  if (!result.issues.length) {
    return [
      `Content validation passed: ${result.projects} projects, ${result.blogPosts} blog posts.`,
    ];
  }

  return [
    `Content validation failed with ${result.issues.length} issue(s):`,
    ...result.issues.map((issue) => `- ${issue.filePath}: ${issue.message}`),
  ];
}
