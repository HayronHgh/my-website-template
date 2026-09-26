import { z } from "zod";

export const researchStageSchema = z.enum([
  "exploring",
  "implementing",
  "evaluating",
  "published",
]);

export const researchMetadataSchema = z.object({
  area: z.string().trim().min(1).max(80),
  rank: z.number().int().min(0).max(999),
  stage: researchStageSchema,
}).strict();

export type ResearchMetadata = z.infer<typeof researchMetadataSchema>;

export const researchStageLabels: Record<ResearchMetadata["stage"], string> = {
  exploring: "探索中",
  implementing: "實作中",
  evaluating: "評估中",
  published: "成果整理",
};

export function readResearchMetadata(data: Record<string, unknown>) {
  return researchMetadataSchema.parse({
    area: data.researchArea,
    rank: data.researchRank,
    stage: data.researchStage,
  });
}

const researchParameterSchema = z.object({
  default: z.number().finite(),
  description: z.string().trim().max(240).optional(),
  key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
  label: z.string().trim().min(1).max(80),
  max: z.number().finite(),
  min: z.number().finite(),
  step: z.number().finite().positive(),
}).strict().superRefine((value, ctx) => {
  if (value.max <= value.min) {
    ctx.addIssue({ code: "custom", path: ["max"], message: "max must be greater than min." });
  }
  if (value.default < value.min || value.default > value.max) {
    ctx.addIssue({ code: "custom", path: ["default"], message: "default must be inside the allowed range." });
  }
});

const researchOutputValueSchema = z.union([
  z.string().max(160),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

const researchMetricSchema = z.object({
  label: z.string().trim().min(1).max(80),
  value: researchOutputValueSchema,
  unit: z.string().trim().max(24).optional(),
}).strict();

const researchTableSchema = z.object({
  title: z.string().trim().min(1).max(120),
  columns: z.array(z.string().trim().min(1).max(80)).min(1).max(12),
  rows: z.array(z.array(researchOutputValueSchema).min(1).max(12)).max(100),
}).strict().superRefine((value, ctx) => {
  value.rows.forEach((row, index) => {
    if (row.length !== value.columns.length) {
      ctx.addIssue({ code: "custom", path: ["rows", index], message: "Each table row must match the column count." });
    }
  });
});

const researchPlotSeriesSchema = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  label: z.string().trim().min(1).max(80),
  points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() }).strict()).min(2).max(500),
}).strict();

const researchPlotSchema = z.object({
  title: z.string().trim().min(1).max(120),
  xLabel: z.string().trim().min(1).max(60),
  yLabel: z.string().trim().min(1).max(60),
  yScale: z.enum(["linear", "log"]).default("linear"),
  series: z.array(researchPlotSeriesSchema).min(1).max(6),
}).strict();

export const researchExperimentResultSchema = z.object({
  summary: z.string().trim().min(1).max(500),
  metrics: z.array(researchMetricSchema).max(12).default([]),
  tables: z.array(researchTableSchema).max(6).default([]),
  plots: z.array(researchPlotSchema).max(4).default([]),
}).strict();

export type ResearchExperimentResult = z.infer<typeof researchExperimentResultSchema>;

export const researchExperimentSchema = z.object({
  description: z.string().trim().min(1).max(500),
  parameters: z.array(researchParameterSchema).min(1).max(12),
  sampleResult: researchExperimentResultSchema.optional(),
  timeoutMs: z.number().int().min(500).max(10_000).default(5_000),
  title: z.string().trim().min(1).max(120),
  version: z.literal(1),
}).strict().superRefine((value, ctx) => {
  const keys = value.parameters.map((parameter) => parameter.key);
  if (new Set(keys).size !== keys.length) {
    ctx.addIssue({ code: "custom", path: ["parameters"], message: "Parameter keys must be unique." });
  }
});

export type ResearchExperiment = z.infer<typeof researchExperimentSchema>;
