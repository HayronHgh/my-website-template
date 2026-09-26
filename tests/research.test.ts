import { describe, expect, it } from "vitest";
import { validateExperimentParameters } from "@/lib/research/runner";
import { readResearchMetadata, researchExperimentResultSchema, researchExperimentSchema } from "@/lib/research/schema";
import { validateContent } from "@/lib/content/validation";

const experiment = researchExperimentSchema.parse({
  version: 1,
  title: "PSO parameter check",
  description: "A deterministic parameter contract for the public runner.",
  parameters: [{ key: "particles", label: "Particles", min: 4, max: 100, step: 1, default: 20 }],
});

describe("research content contracts", () => {
  it("keeps the repository content tree valid", async () => {
    expect((await validateContent(process.cwd())).issues).toEqual([]);
  });

  it("reads ranked research metadata", () => {
    expect(readResearchMetadata({ researchArea: "Optimization", researchRank: 10, researchStage: "implementing" })).toEqual({
      area: "Optimization", rank: 10, stage: "implementing",
    });
  });

  it("accepts only declared in-range experiment values", () => {
    expect(validateExperimentParameters(experiment, { particles: 32 })).toEqual({ particles: 32 });
    expect(() => validateExperimentParameters(experiment, { particles: 101 })).toThrow("必須介於");
    expect(() => validateExperimentParameters(experiment, { particles: 32, hidden: 1 })).toThrow("不一致");
  });

  it("rejects duplicate parameter keys", () => {
    expect(() => researchExperimentSchema.parse({
      ...experiment,
      parameters: [experiment.parameters[0], experiment.parameters[0]],
    })).toThrow();
  });

  it("accepts designed metrics, tables, and plot output", () => {
    expect(researchExperimentResultSchema.parse({
      summary: "A structured experiment result.",
      metrics: [{ label: "Accuracy", value: 87.1, unit: "%" }],
      plots: [{ title: "Curve", xLabel: "Epoch", yLabel: "Accuracy", series: [{ label: "Model", points: [{ x: 1, y: 60 }, { x: 2, y: 70 }] }] }],
      tables: [{ title: "Ablation", columns: ["Mode", "Score"], rows: [["baseline", 80.2]] }],
    }).plots[0].yScale).toBe("linear");
  });

  it("rejects table rows that do not match their columns", () => {
    expect(() => researchExperimentResultSchema.parse({
      summary: "Invalid table.",
      metrics: [],
      plots: [],
      tables: [{ title: "Mismatch", columns: ["A", "B"], rows: [[1]] }],
    })).toThrow("column count");
  });
});
