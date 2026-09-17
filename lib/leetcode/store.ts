import path from "node:path";
import { createArticleStore } from "@/lib/admin/articles/store";
import { problemSchema, readProblemMetadata, validateEntryContent } from "@/lib/leetcode/schema";
import { AdminApiError } from "@/lib/admin/http";

export const problemStore = createArticleStore({
  blogDirectory: path.join(process.cwd(), "content", "leetcode"),
  trashDirectory: path.join(process.cwd(), "content", ".trash", "leetcode"),
  readMetadata(data) {
    return { problem: readProblemMetadata(data) };
  },
  writeMetadata(input) {
    const result = problemSchema.safeParse(input.problem);
    if (!result.success) throw new AdminApiError(422, "invalid_problem", "請填寫題號、難度、進度與語言。");
    try { validateEntryContent(input.content, input.published, result.data); }
    catch (error) { throw new AdminApiError(422, "invalid_problem_sections", (error as Error).message); }
    return { kind: "leetcode", ...result.data };
  },
});
