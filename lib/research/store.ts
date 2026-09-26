import path from "node:path";
import { AdminApiError } from "@/lib/admin/http";
import { createArticleStore } from "@/lib/admin/articles/store";
import {
  readResearchMetadata,
  researchMetadataSchema,
} from "@/lib/research/schema";

export const RESEARCH_CONTENT_DIRECTORY = path.join(process.cwd(), "content", "research");

export const researchStore = createArticleStore({
  blogDirectory: RESEARCH_CONTENT_DIRECTORY,
  trashDirectory: path.join(process.cwd(), "content", ".trash", "research"),
  readMetadata(data) {
    return { research: readResearchMetadata(data) };
  },
  writeMetadata(input) {
    const result = researchMetadataSchema.safeParse(input.research);
    if (!result.success) {
      throw new AdminApiError(422, "invalid_research", "請填寫研究領域、排序與目前階段。");
    }
    return {
      kind: "research",
      researchArea: result.data.area,
      researchRank: result.data.rank,
      researchStage: result.data.stage,
    };
  },
});
