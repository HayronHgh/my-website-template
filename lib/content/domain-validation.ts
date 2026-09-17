import { promises as fs } from "node:fs";
import path from "node:path";
import { resumeSchema } from "@/lib/resume/schema";
import { readProblemMetadata, validateEntryContent } from "@/lib/leetcode/schema";
import { blogFrontmatterSchema } from "@/lib/blog/schema";
import { parseFrontmatter } from "@/lib/content/frontmatter";
import type { ContentValidationIssue } from "@/lib/content/validation";

export async function validateAdditionalDomains(root: string, projectSlugs: Set<string>, issues: ContentValidationIssue[]) {
  const report = (filePath: string, error: unknown) => issues.push({ filePath: path.relative(root, filePath), message: error instanceof Error ? error.message : String(error) });
  const resumePath = path.join(root, "content/resume/resume.json");
  try {
    const resume = resumeSchema.parse(JSON.parse(await fs.readFile(resumePath, "utf8")));
    for (const slug of resume.projectSlugs) if (!projectSlugs.has(slug)) throw new Error(`Unknown resume project: ${slug}`);
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") report(resumePath, error); }
  async function walk(directory: string, depth: number) {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") report(directory, error); return; }
    for (const entry of entries) {
      const file = path.join(directory, entry.name);
      if (entry.name.startsWith(".")) continue;
      if (entry.isSymbolicLink()) { report(file, new Error("Symbolic links are not supported.")); continue; }
      if (entry.isDirectory() && depth < 2) {
        if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.name)) report(file, new Error("Invalid problem slug."));
        await walk(file, depth + 1);
      } else if (entry.isFile() && entry.name === "main.md") {
        try {
          const parsed = parseFrontmatter(await fs.readFile(file, "utf8"));
          const metadata = readProblemMetadata(parsed.data);
          const common = metadata.entryType === "template" && parsed.data.published === false
            ? blogFrontmatterSchema.omit({ date: true }).parse(parsed.data)
            : blogFrontmatterSchema.parse(parsed.data);
          validateEntryContent(parsed.content, common.published !== false, metadata);
        } catch (error) { report(file, error); }
      }
    }
  }
  await walk(path.join(root, "content/leetcode"), 0);
}
