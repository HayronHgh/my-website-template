import { afterEach, describe, expect, it } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { createArticleStore } from "@/lib/admin/articles/store";
import { createWorkingCopyStore } from "@/lib/admin/working-copies";
import {
  parseDocumentMarkdown,
  serializeDocumentMarkdown,
  withDocumentBaselines,
} from "@/lib/admin/document-markdown";
import { getMarkdownOutline } from "@/lib/content/outline";
import { markdownToHtml } from "@/lib/blog/markdown";
import { assertCanonicalSaveMode } from "@/lib/admin/write-policy";
import { getSchema } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import {
  RawMarkdown,
  SourceTrivia,
} from "@/components/admin/document-composer";
const roots: string[] = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((p) => fs.rm(p, { recursive: true, force: true })),
  );
});
const user = {
  role: "admin" as const,
  username: "author",
  displayName: "Author",
};
async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "writing-test-"));
  roots.push(root);
  const articles = createArticleStore({
    blogDirectory: path.join(root, "blog"),
  });
  await articles.create(
    "example",
    {
      title: "Original",
      description: "Original summary",
      content: "## Original\n\nBody\n",
      published: true,
      tags: ["Test"],
      date: "2026-10-30",
    },
    "admin",
  );
  const copies = createWorkingCopyStore(path.join(root, ".editor-workspace"), {
    articles,
    research: articles,
    leetcode: articles,
  });
  return { root, articles, copies };
}
describe("isolated working copies", () => {
  it("rejects old-tab canonical autosaves while retaining explicit writes",()=>{expect(()=>assertCanonicalSaveMode("manual")).not.toThrow();expect(()=>assertCanonicalSaveMode("autosave")).toThrowError(expect.objectContaining({status:409,code:"working_copy_required"}));});
  it("keeps uploaded draft assets private until explicit publication", async () => {
    const { root, copies, articles } = await fixture();
    const copy = await copies.open("articles", "example", user);
    const asset = await copies.uploadMedia(
      copy.id,
      new File([new Uint8Array([137, 80, 78, 71])], "test.png", {
        type: "image/png",
      }),
      user,
    );
    expect(asset.url).toContain("/api/admin/working-copies/");
    await expect(
      fs.access(path.join(root, "blog/example", asset.assetPath)),
    ).rejects.toThrow();
    const saved = await copies.update(
      copy.id,
      {
        revision: copy.revision,
        slug: copy.slug,
        fields: { ...copy.fields, content: `![test](${asset.assetPath})` },
      },
      user,
    );
    await copies.publish(saved.id, saved.revision, user);
    expect(
      await fs.readFile(path.join(root, "blog/example", asset.assetPath)),
    ).toEqual(Buffer.from([137, 80, 78, 71]));
    expect((await articles.read("example")).content).toContain(asset.assetPath);
  });
  it("autosaves incomplete metadata without changing a published article", async () => {
    const { articles, copies } = await fixture();
    const before = await articles.read("example");
    const copy = await copies.open("articles", "example", user);
    await copies.update(
      copy.id,
      {
        revision: copy.revision,
        slug: copy.slug,
        fields: { ...copy.fields, title: "", content: "Unfinished" },
      },
      user,
    );
    expect(await articles.read("example")).toEqual(before);
  });
  it("only publishes explicitly and rejects stale working revisions", async () => {
    const { articles, copies } = await fixture();
    const copy = await copies.open("articles", "example", user);
    const saved = await copies.update(
      copy.id,
      {
        revision: copy.revision,
        slug: copy.slug,
        fields: { ...copy.fields, content: "Updated" },
      },
      user,
    );
    await expect(
      copies.update(
        copy.id,
        { revision: copy.revision, slug: copy.slug, fields: copy.fields },
        user,
      ),
    ).rejects.toMatchObject({ status: 409 });
    await copies.publish(saved.id, saved.revision, user);
    expect((await articles.read("example")).content.trim()).toBe("Updated");
  });
  it("does not overwrite SSH or other-device changes", async () => {
    const { articles, copies } = await fixture();
    const copy = await copies.open("articles", "example", user);
    const article = await articles.read("example");
    await articles.update(
      "example",
      { ...article, content: "External" },
      "admin",
    );
    await expect(
      copies.publish(copy.id, copy.revision, user),
    ).rejects.toMatchObject({ status: 409 });
    expect((await articles.read("example")).content.trim()).toBe("External");
  });
  it("allows empty new workspaces and refuses publishing them", async () => {
    const { copies } = await fixture();
    const copy = await copies.open("articles", undefined, user);
    const saved = await copies.update(
      copy.id,
      { revision: copy.revision, slug: "", fields: copy.fields },
      user,
    );
    await expect(
      copies.publish(saved.id, saved.revision, user),
    ).rejects.toMatchObject({ status: 422 });
  });
  it("preserves role and path restrictions and archives discarded work", async () => {
    const { copies } = await fixture();
    await expect(copies.read("../secret", user)).rejects.toMatchObject({
      status: 400,
    });
    await expect(
      copies.open("articles", "example", { ...user, role: "editor" }),
    ).rejects.toMatchObject({ status: 403 });
    const copy = await copies.open("articles", undefined, user);
    await copies.discard(copy.id, copy.revision, user);
    expect(await copies.list("articles", user)).toHaveLength(0);
    await expect(copies.read(copy.id, user)).rejects.toMatchObject({
      status: 404,
    });
  });
});
describe("Markdown compatibility", () => {
  const examples = [
    "\n## 中文標題\n\n原文 **粗體** 與 `code`。\n\n",
    "| A | B |\n| :--- | ---: |\n| 1 | 2 |\n",
    '```mermaid\nflowchart TD\nA-->B\n```\n\n```chart\n{"type":"bar"}\n```',
    "![截圖](assets/a.png#width=70%)\n\nhttps://youtu.be/NoQyOZb8cm8\n\n$$\nx^2\n$$\n",
    "- [x] task\n- [ ] todo\n\n[ref]: https://example.com\n\n[link][ref]\n",
    "> 引用\n>\n> 第二段\n\n1. ordered\n   - nested\n\n~~~js\n`hello`\n~~~\n",
  ];
  it.each(examples)("preserves an untouched document verbatim", (source) => {
    expect(
      serializeDocumentMarkdown(
        withDocumentBaselines(parseDocumentMarkdown(source)),
      ),
    ).toBe(source);
  });
  it.each(examples)(
    "preserves source after actual editor schema normalization",
    (source) => {
      const schema = getSchema([
        StarterKit,
        TableKit,
        RawMarkdown,
        SourceTrivia,
      ]);
      const normalized = schema
        .nodeFromJSON(parseDocumentMarkdown(source))
        .toJSON();
      const baseline = withDocumentBaselines(normalized);
      expect(
        serializeDocumentMarkdown(schema.nodeFromJSON(baseline).toJSON()),
      ).toBe(source);
    },
  );
  it("editing a paragraph preserves neighboring embeds and original whitespace", () => {
    const source =
      "## Heading\n\nOriginal\n\n```mermaid\nflowchart TD\nA-->B\n```\n";
    const doc = withDocumentBaselines(parseDocumentMarkdown(source));
    doc.content![1].content = [{ type: "text", text: "Changed" }];
    expect(serializeDocumentMarkdown(doc)).toBe(
      source.replace("Original", "Changed"),
    );
  });
  it("creates unique anchors without treating fenced headings as sections", async () => {
    const source = "## 同名\n\n## 同名\n\n```txt\n## hidden\n```";
    expect(getMarkdownOutline(source).map((h) => h.id)).toEqual([
      "section-同名",
      "section-同名-2",
    ]);
    const html = await markdownToHtml(source);
    expect(html).toContain('id="section-同名"');
    expect(html).toContain('id="section-同名-2"');
  });
});
