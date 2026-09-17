import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { problemStore } from "@/lib/leetcode/store";
import { problemSections, problemTemplate, validateProblemContent } from "@/lib/leetcode/schema";
import { readDocument, updateDocument } from "@/lib/admin/documents";
import { createArticleStore } from "@/lib/admin/articles/store";

let root = "";
afterEach(async () => { vi.restoreAllMocks(); if (root) { await rm(root, { recursive: true, force: true }); root = ""; } });
describe("content workspace boundaries", () => {
  it("requires real, populated problem sections only for publication", () => {
    expect(() => validateProblemContent("", false)).not.toThrow();
    expect(() => validateProblemContent(problemTemplate, true)).toThrow();
    expect(() => validateProblemContent("~~~md\n" + problemTemplate + "\n~~~", true)).toThrow();
    expect(() => validateProblemContent(problemSections.map((h) => "## " + h + "\n\nContent\n").join("\n"), true)).not.toThrow();
  });
  it("round-trips problem metadata without mixing the article directory", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "workspace-problem-"));
    // The production store is imported only to ensure its module initializes.
    expect(problemStore.create).toBeTypeOf("function");
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.resetModules();
    const { problemStore: isolated } = await import("@/lib/leetcode/store");
    const draft = { title: "Two Sum", date: "2026-09-17", description: "Practice", tags: [], published: false, content: problemTemplate, problem: { id: 1, difficulty: "Easy" as const, status: "Todo" as const, language: "TypeScript" } };
    const created = await isolated.create("two-sum", draft, "admin");
    expect((await isolated.read("two-sum")).problem).toEqual(draft.problem);
    expect(await isolated.list({ status: "draft" })).toHaveLength(1);
    expect(await createArticleStore({ blogDirectory: path.join(root,"content/blog"), trashDirectory: path.join(root,"content/.trash/blog") }).list({})).toEqual([]);
    const updated = await isolated.update("two-sum", { ...draft, problem: { ...draft.problem, status: "Solved" }, revision: created.revision }, "admin");
    expect(updated.problem?.status).toBe("Solved");
    await expect(isolated.update("two-sum", { ...draft, revision: created.revision }, "admin")).rejects.toMatchObject({ status: 409 });
  });
  it("protects document paths and revisions and rejects blank project bodies", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "workspace-doc-"));
    await mkdir(path.join(root, "content/projects/demo"), { recursive: true });
    await writeFile(path.join(root, "content/projects/demo/main.md"), "# Original\n");
    vi.spyOn(process, "cwd").mockReturnValue(root);
    await expect(readDocument("../secret")).rejects.toMatchObject({ status: 400 });
    const record = await readDocument("projects/demo/main.md");
    await expect(updateDocument(record.key, "  ", record.revision)).rejects.toMatchObject({ status: 422 });
    const next = await updateDocument(record.key, "# Updated\n", record.revision);
    expect(next.revision).not.toBe(record.revision);
    await expect(updateDocument(record.key, "# Stale", record.revision)).rejects.toMatchObject({ status: 409 });
    expect(await readFile(path.join(root,"content/projects/demo/main.md"),"utf8")).toBe("# Updated\n");
  });
});
