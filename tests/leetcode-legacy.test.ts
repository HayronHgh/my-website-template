import { describe, expect, it } from "vitest";
import { readProblemMetadata, validateEntryContent } from "@/lib/leetcode/schema";
import { safeMigrationTarget } from "@/lib/leetcode/redirects";

describe("legacy LeetCode compatibility", () => {
  it("reads legacy solution metadata and allows original sections", () => {
    const metadata = readProblemMetadata({ title: "1. Two Sum", id: 1, difficulty: "Easy", status: "Attempted", language: "Python", entryType: "problem", format: "legacy" });
    expect(() => validateEntryContent("## 我的直覺\n\nOriginal prose", true, metadata)).not.toThrow();
    expect(() => validateEntryContent("", true, metadata)).toThrow();
    expect(() => validateEntryContent("Original prose", true, { ...metadata, format: "v1" })).toThrow();
  });
  it("does not invent problem metadata for notes or publish templates", () => {
    const note = readProblemMetadata({ id: null, difficulty: null, status: null, language: null, entryType: "note", format: "legacy" });
    expect(() => validateEntryContent("Study plan", true, note)).not.toThrow();
    expect(() => validateEntryContent("Template", true, { ...note, entryType: "template" })).toThrow();
    expect(() => readProblemMetadata({ ...note, entryType: "problem" })).toThrow();
    expect(() => readProblemMetadata({ ...note, id: 1 })).toThrow();
  });
  it("only permits local, bounded migration targets", () => {
    expect(safeMigrationTarget("1-two-sum")).toBe("1-two-sum");
    expect(safeMigrationTarget("notes/daily-practice")).toBe("notes/daily-practice");
    for (const target of ["../secret", "//evil.example", "https://evil.example", "a/b/c", "%2e%2e", null]) expect(safeMigrationTarget(target)).toBeNull();
  });
});
