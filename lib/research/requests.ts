import {
  createArticleRequestSchema as createBase,
  updateArticleRequestSchema as updateBase,
} from "@/lib/admin/schemas";
import { researchMetadataSchema } from "@/lib/research/schema";

export const createResearchRequestSchema = createBase.extend({
  research: researchMetadataSchema,
});

export const updateResearchRequestSchema = updateBase.extend({
  research: researchMetadataSchema,
});
