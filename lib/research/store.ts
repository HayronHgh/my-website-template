import path from "node:path";
import { createArticleReader } from "@/lib/content/article-reader";
import { readResearchMetadata } from "@/lib/research/schema";

export const RESEARCH_CONTENT_DIRECTORY = path.join(process.cwd(), "content", "research");

export const researchStore = createArticleReader({
  directory: RESEARCH_CONTENT_DIRECTORY,
  readMetadata(data) {
    return { research: readResearchMetadata(data) };
  },
});
