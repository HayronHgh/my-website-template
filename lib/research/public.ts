import { promises as fs } from "node:fs";
import path from "node:path";
import { AdminApiError } from "@/lib/admin/http";
import { markdownToHtml } from "@/lib/blog/markdown";
import { parseSafeExistingBlogSlug } from "@/lib/blog/slug";
import { getVersionedResearchAssetUrl } from "@/lib/research/assets";
import { researchExperimentSchema } from "@/lib/research/schema";
import { RESEARCH_CONTENT_DIRECTORY, researchStore } from "@/lib/research/store";

function isInsideDirectory(parent: string, target: string) {
  return target === parent || target.startsWith(`${parent}${path.sep}`);
}

export function getResearchDirectoryPath(slugValue: string | readonly string[]) {
  const parsed = parseSafeExistingBlogSlug(slugValue);
  if (!parsed) return null;
  const root = path.resolve(RESEARCH_CONTENT_DIRECTORY);
  const target = path.resolve(root, ...parsed.pathSegments);
  return target !== root && isInsideDirectory(root, target) ? target : null;
}

export async function getResearchExperiment(slug: string) {
  const directory = getResearchDirectoryPath(slug);
  if (!directory) return null;
  const configPath = path.join(directory, "experiment.json");
  const scriptPath = path.join(directory, "experiment.mjs");

  try {
    const [directoryStats, configStats, scriptStats] = await Promise.all([
      fs.lstat(directory),
      fs.lstat(configPath),
      fs.lstat(scriptPath),
    ]);
    if (
      !directoryStats.isDirectory() || directoryStats.isSymbolicLink() ||
      !configStats.isFile() || configStats.isSymbolicLink() ||
      !scriptStats.isFile() || scriptStats.isSymbolicLink()
    ) return null;
    return {
      config: researchExperimentSchema.parse(JSON.parse(await fs.readFile(configPath, "utf8"))),
      scriptPath: await fs.realpath(scriptPath),
    };
  } catch {
    return null;
  }
}

export async function getPublishedResearchEntries() {
  const entries = await researchStore.list({ status: "published" });
  const enriched = await Promise.all(entries.map(async (entry) => ({
    ...entry,
    hasExperiment: Boolean(await getResearchExperiment(entry.slug)),
  })));
  return enriched.sort((left, right) =>
    (left.research?.rank ?? 999) - (right.research?.rank ?? 999) ||
    right.date.localeCompare(left.date));
}

export async function getPublishedResearchEntry(slug: string) {
  try {
    const article = await researchStore.read(slug);
    if (!article.published) return null;
    return {
      ...article,
      experiment: (await getResearchExperiment(article.slug))?.config ?? null,
      html: await markdownToHtml(article.content, {
        resolveAssetUrl: (assetPath) => getVersionedResearchAssetUrl(article.slug, assetPath),
      }),
    };
  } catch (error) {
    if (error instanceof AdminApiError && [400, 404].includes(error.status)) return null;
    throw error;
  }
}
