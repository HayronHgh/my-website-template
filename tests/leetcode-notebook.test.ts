import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createArticleStore } from "@/lib/admin/articles/store";
import { createNotebookOpener, openNotebookSchema } from "@/lib/leetcode/open-notebook";
import { cleanProblemTitle } from "@/lib/leetcode/notebook";
import { problemSchema, readProblemMetadata, problemTemplate, validateEntryContent } from "@/lib/leetcode/schema";

const roots: string[] = [];
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true }); });
async function setup() {
  const root = await mkdtemp(path.join(os.tmpdir(), "leetcode-notebook-"));
  roots.push(root);
  const store = createArticleStore({
    blogDirectory: path.join(root, "content", "leetcode"),
    readMetadata: (data) => ({ problem: readProblemMetadata(data) }),
    writeMetadata: (input) => {
      const problem = problemSchema.parse(input.problem);
      validateEntryContent(input.content, input.published, problem);
      return { kind: "leetcode", ...problem };
    },
  });
  return { store, open: createNotebookOpener(store) };
}

describe("problem notebooks", () => {
  it("creates a private template that can be saved without status or difficulty", async () => {
    const { open, store } = await setup();
    const { article, created } = await open(openNotebookSchema.parse({ intent: "open-notebook", id: 110, title: "110. Balanced Binary Tree" }), "editor");
    expect(created).toBe(true);
    expect(article).toMatchObject({ title: "Balanced Binary Tree", published: false });
    expect(article.content.trim()).toBe(problemTemplate.trim());
    expect(article.problem).toMatchObject({ id: 110, difficulty: null, status: null, language: "Python" });
    const saved = await store.update(article.slug, { ...article, content: article.content + "\nA new observation.\n" }, "editor", "autosave");
    expect(saved.published).toBe(false);
    expect((await store.read(article.slug)).content).toContain("A new observation.");
  });

  it("opens the existing notebook by id and preserves edits on repeated clicks", async () => {
    const { open, store } = await setup();
    const input = openNotebookSchema.parse({ intent: "open-notebook", id: 101, title: "Symmetric Tree" });
    const first = await open(input, "admin");
    await store.update(first.article.slug, { ...first.article, content: "## My existing notes\n\nKeep this.\n" }, "admin");
    const repeated = await open({ ...input, title: "A different spelling" }, "admin");
    expect(repeated.created).toBe(false);
    expect(repeated.article.content).toContain("Keep this.");
    expect(await store.list()).toHaveLength(1);
  });

  it("serializes concurrent opens to avoid duplicate notebooks", async () => {
    const { open, store } = await setup();
    const input = openNotebookSchema.parse({ intent: "open-notebook", id: 110, title: "Balanced Binary Tree" });
    const results = await Promise.all([open(input, "admin"), open(input, "admin")]);
    expect(results.filter((result) => result.created)).toHaveLength(1);
    expect(await store.list()).toHaveLength(1);
  });

  it("rejects attempts to publish as part of opening a notebook", () => {
    expect(openNotebookSchema.safeParse({ intent: "open-notebook", id: 1, title: "Two Sum", published: true }).success).toBe(false);
  });

  it.each([[1, "1.Two Sums", "Two Sums"], [100, "100. Same Tree", "Same Tree"], [1, "LeetCode #1: Two Sum", "Two Sum"], [15, "3Sum", "3Sum"], [1, "100. Same Tree", "100. Same Tree"]])("cleans only a matching numbered title: %s", (id, title, expected) => {
    expect(cleanProblemTitle(String(title), Number(id))).toBe(expected);
  });
});
