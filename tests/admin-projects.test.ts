import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { archiveProject, createProject } from "@/lib/admin/projects";
import { readDocument, updateDocument } from "@/lib/admin/documents";
import { getProjectBySlug } from "@/lib/projects/meta";

const slug = `admin-project-${process.pid}-${Date.now()}`;
const directory = path.join(process.cwd(), "content", "projects", slug);
let archiveDirectory: string | null = null;
afterEach(async () => {
  await fs.rm(directory, { force: true, recursive: true });
  if (archiveDirectory) await fs.rm(archiveDirectory, { force: true, recursive: true });
  archiveDirectory = null;
});

describe("admin project creation", () => {
  it("creates a safe unpublished project with editable documents", async () => {
    await expect(createProject(slug, "Admin Project")).resolves.toEqual({ slug });
    const meta = JSON.parse(await fs.readFile(path.join(directory, "meta.json"), "utf8"));
    expect(meta).toMatchObject({ published: false, slug, title: "Admin Project" });
    await expect(fs.readFile(path.join(directory, "main.md"), "utf8")).resolves.toContain("# Admin Project");
  });

  it("rejects duplicate and unsafe slugs", async () => {
    await createProject(slug, "Admin Project");
    await expect(createProject(slug, "Duplicate")).rejects.toMatchObject({ code: "project_exists", status: 409 });
    await expect(createProject("../escape", "Unsafe")).rejects.toMatchObject({ code: "invalid_slug", status: 422 });
  });

  it("saves incomplete drafts but requires complete metadata before publishing", async () => {
    await createProject(slug, "Incomplete Project");
    const key = `projects/${slug}/meta.json`;
    const initial = await readDocument(key);
    const incomplete = { slug, title: "Incomplete Project", published: false };
    const draft = await updateDocument(key, incomplete, initial.revision);
    expect(draft.data).toMatchObject(incomplete);
    await expect(getProjectBySlug(slug)).resolves.toBeNull();
    await expect(updateDocument(key, { ...incomplete, published: true }, draft.revision))
      .rejects.toMatchObject({ code: "invalid_document", status: 422 });
    const complete = { ...initial.data as object, published: true };
    await updateDocument(key, complete, draft.revision);
    await expect(getProjectBySlug(slug)).resolves.toMatchObject({ slug, published: true });
    const published = await readDocument(key);
    await updateDocument(key, { ...complete, published: false }, published.revision);
    await expect(getProjectBySlug(slug)).resolves.toBeNull();
  });

  it("moves deleted projects and assets to a recoverable archive", async () => {
    await createProject(slug, "Archive Project");
    await fs.mkdir(path.join(directory, "assets"));
    await fs.writeFile(path.join(directory, "assets", "cover.txt"), "archive me");
    const current = await readDocument(`projects/${slug}/meta.json`);
    await expect(archiveProject(slug, "0".repeat(64)))
      .rejects.toMatchObject({ code: "revision_conflict", status: 409 });
    const archive = await archiveProject(slug, current.revision);
    archiveDirectory = path.join(process.cwd(), "content", ".trash", "projects", archive.archiveId);
    await expect(fs.stat(directory)).rejects.toMatchObject({ code: "ENOENT" });
    await expect(fs.readFile(path.join(archiveDirectory, slug, "assets", "cover.txt"), "utf8"))
      .resolves.toBe("archive me");
    await expect(getProjectBySlug(slug)).resolves.toBeNull();
  });
});
