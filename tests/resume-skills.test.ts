import { expect, it } from "vitest";
import { resumeSchema } from "@/lib/resume/schema";

const base = { resumeSummary: "Built desktop systems and data workflows.", resumeExperience: [], resumeSections: [], projectSlugs: [] };

it("keeps existing resume documents valid without a skills override", () => {
  expect(resumeSchema.parse(base).skillItems).toBeUndefined();
});

it("accepts resume-specific evidence without self-rated levels or scores", () => {
  const result = resumeSchema.parse({ ...base, skillItems: [{ name: "Desktop systems", tone: "cyan", evidence: ["Electron / SQLite ERP"] }] });
  expect(result.skillItems?.[0].evidence).toEqual(["Electron / SQLite ERP"]);
  expect(result.skillItems?.[0].level).toBeUndefined();
  expect(result.skillItems?.[0].value).toBeUndefined();
});

it("validates skill data using the existing site schema", () => {
  expect(resumeSchema.safeParse({ ...base, skillItems: [{ name: "Invalid", tone: "not-a-tone" }] }).success).toBe(false);
});
