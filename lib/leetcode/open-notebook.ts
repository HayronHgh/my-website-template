import { z } from "zod";
import type { AdminRole } from "@/types/admin";
import { AdminApiError } from "@/lib/admin/http";
import { problemTemplate } from "@/lib/leetcode/schema";
import { cleanProblemTitle, problemNotebookSlug } from "@/lib/leetcode/notebook";
import { problemStore } from "@/lib/leetcode/store";

export const openNotebookSchema = z.object({
  intent: z.literal("open-notebook"),
  id: z.number().int().positive().max(100_000),
  title: z.string().trim().min(1).max(160),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).nullable().default(null),
  language: z.string().trim().min(1).max(40).default("Python"),
}).strict();

export function createNotebookOpener(store: Pick<typeof problemStore, "list" | "read" | "create"> = problemStore) {
  let queue = Promise.resolve();
  return (input: z.infer<typeof openNotebookSchema>, role: AdminRole) => {
    const run = queue.then(async () => {
      const existing = (await store.list({ status: "all" })).filter((post) => post.problem?.id === input.id);
      if (existing.length > 1) throw new AdminApiError(409, "duplicate_problem_id", "此題號有多份題本，請先從清單選擇要編輯的文章。");
      if (existing.length) return { article: await store.read(existing[0].slug), created: false };
      const title = cleanProblemTitle(input.title, input.id);
      const article = await store.create(problemNotebookSlug(input.id, title), {
        title, content: problemTemplate, date: new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()),
        description: `${title} 的解題筆記與思路整理。`, tags: [], published: false,
        problem: { id: input.id, difficulty: input.difficulty, language: input.language, status: null, entryType: "problem", format: "v1" },
      }, role);
      return { article, created: true };
    });
    queue = run.then(() => undefined, () => undefined);
    return run;
  };
}

export const openProblemNotebook = createNotebookOpener();
