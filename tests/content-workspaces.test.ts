import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createArticleReader, ContentNotFoundError } from "@/lib/content/article-reader";
import { problemSections, problemTemplate, validateProblemContent } from "@/lib/leetcode/schema";

let root = "";
afterEach(async () => { vi.restoreAllMocks(); if (root) { await rm(root, { recursive: true, force: true }); root = ""; } });

const post = (frontmatter: string, body = "Body\n") => `---\n${frontmatter}\n---\n\n${body}`;

describe("content workspace boundaries", () => {
  it("requires real, populated problem sections only for publication", () => {
    expect(() => validateProblemContent("", false)).not.toThrow();
    expect(() => validateProblemContent(problemTemplate, true)).toThrow();
    expect(() => validateProblemContent("~~~md\n" + problemTemplate + "\n~~~", true)).toThrow();
    expect(() => validateProblemContent(problemSections.map((h) => "## " + h + "\n\nContent\n").join("\n"), true)).not.toThrow();
  });

  it("reads problem metadata from content/leetcode without mixing the article directory", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "workspace-problem-"));
    await mkdir(path.join(root, "content/leetcode/two-sum"), { recursive: true });
    await mkdir(path.join(root, "content/leetcode/notes/daily"), { recursive: true });
    await writeFile(path.join(root, "content/leetcode/two-sum/main.md"), post('title: Two Sum\ndate: "2026-09-17"\nsummary: Practice\ntags: []\npublished: true\nkind: leetcode\nid: 1\ndifficulty: Easy\nstatus: Solved\nlanguage: TypeScript'));
    await writeFile(path.join(root, "content/leetcode/notes/daily/main.md"), post('title: Daily\ndate: "2026-09-18"\nsummary: Draft\ntags: []\npublished: false\nkind: leetcode\nid: 2\nlanguage: TypeScript'));
    vi.spyOn(process, "cwd").mockReturnValue(root);
    vi.resetModules();
    const { problemStore } = await import("@/lib/leetcode/store");

    expect((await problemStore.read("two-sum")).problem).toMatchObject({ id: 1, difficulty: "Easy", status: "Solved", language: "TypeScript" });
    expect((await problemStore.list({ status: "published" })).map((item) => item.slug)).toEqual(["two-sum"]);
    expect((await problemStore.list({ status: "draft" })).map((item) => item.slug)).toEqual(["notes/daily"]);
    expect(await createArticleReader({ directory: path.join(root, "content/blog") }).list()).toEqual([]);
  });

  it("treats unsafe or missing slugs as not found", async () => {
    root = await mkdtemp(path.join(os.tmpdir(), "workspace-reader-"));
    await mkdir(path.join(root, "articles/real"), { recursive: true });
    await writeFile(path.join(root, "articles/real/main.md"), post('title: Real\ndate: "2026-09-17"\nsummary: Real\ntags: []\npublished: true'));
    const reader = createArticleReader({ directory: path.join(root, "articles") });

    await expect(reader.read("../secret")).rejects.toBeInstanceOf(ContentNotFoundError);
    await expect(reader.read("missing")).rejects.toBeInstanceOf(ContentNotFoundError);
    await expect(reader.read("Real")).rejects.toBeInstanceOf(ContentNotFoundError);
    await expect(reader.read("real")).resolves.toMatchObject({ slug: "real", title: "Real" });

    try { await symlink(path.join(root, "articles/real"), path.join(root, "articles/alias"), "junction"); }
    catch { return; }
    await expect(reader.read("alias")).rejects.toBeInstanceOf(ContentNotFoundError);
    expect((await reader.list()).map((item) => item.slug)).toEqual(["real"]);
  });
});
