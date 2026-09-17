import { z } from "zod";
import { siteSettingsSchema } from "@/lib/content/validation";
export const resumeSchema = siteSettingsSchema.pick({ resumeSummary: true, resumeExperience: true, resumeSections: true }).required().extend({
  projectSlugs: z.array(z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)).default([]),
}).strict();
export type ResumeData = z.infer<typeof resumeSchema>;
