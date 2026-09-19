import { promises as fs } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createProject } from "@/lib/admin/projects";

const slug = `admin-project-${process.pid}-${Date.now()}`;
const directory = path.join(process.cwd(), "content", "projects", slug);
afterEach(() => fs.rm(directory, { force: true, recursive: true }));

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
});
