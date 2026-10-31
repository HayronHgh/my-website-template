import path from "node:path";
import { createArticleReader } from "@/lib/content/article-reader";
import { readProblemMetadata } from "@/lib/leetcode/schema";

export const problemStore = createArticleReader({
  directory: path.join(process.cwd(), "content", "leetcode"),
  readMetadata(data) {
    return { problem: readProblemMetadata(data) };
  },
});
