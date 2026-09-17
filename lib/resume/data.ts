import path from "node:path";
import { readTextFileWithMtimeCache } from "@/lib/content/cache";
import { resumeSchema } from "@/lib/resume/schema";
export async function readResume() {
  try {
    return resumeSchema.parse(JSON.parse(await readTextFileWithMtimeCache(path.join(process.cwd(), "content", "resume", "resume.json"))));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
