import path from "node:path";
import { readTextFileWithMtimeCache } from "@/lib/content/cache";
import { problemStore } from "@/lib/leetcode/store";
import { AdminApiError } from "@/lib/admin/http";

export function safeMigrationTarget(value: unknown): string | null {
  return typeof value === "string" && /^[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)?$/.test(value) ? value : null;
}

export async function getMigratedProblemPath(oldSlug: string) {
  let redirects: Record<string, unknown>;
  try {
    redirects = JSON.parse(await readTextFileWithMtimeCache(path.join(process.cwd(), "content/leetcode/redirects.json")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
  const target = safeMigrationTarget(Object.hasOwn(redirects, oldSlug) ? redirects[oldSlug] : null);
  if (!target) return null;
  try {
    const post = await problemStore.read(target);
    return post.published ? `/leetcode/${target}` : null;
  } catch (error) {
    if (error instanceof AdminApiError && [400, 404].includes(error.status)) return null;
    throw error;
  }
}
