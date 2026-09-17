import { createArticleRequestSchema as createBase, updateArticleRequestSchema as updateBase } from "@/lib/admin/schemas";
import { problemSchema } from "@/lib/leetcode/schema";

export const createArticleRequestSchema = createBase.extend({ problem: problemSchema });
export const updateArticleRequestSchema = updateBase.extend({ problem: problemSchema });
