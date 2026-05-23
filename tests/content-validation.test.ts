import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { validateContent } from "@/lib/content/validation";

let rootDirectory: string;

async function writeFile(relativePath: string, content: string) {
  const filePath = path.join(rootDirectory, relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
}

async function writeValidProject(slug = "project-a") {
  await writeFile(
    `content/projects/${slug}/meta.json`,
    JSON.stringify(
      {
        slug,
        title: "Project A",
        category: "Product System",
        summary: "Summary",
        description: "Description",
        tech: ["Next.js"],
        cover: `generated:${slug}`,
        accent: "cyan",
        detailsUrl: `/projects/${slug}`,
        published: true,
      },
      null,
      2,
    ),
  );
  await writeFile(`content/projects/${slug}/main.md`, "# Project A\n\n![Diagram](diagram.png)");
}

beforeEach(async () => {
  rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-content-"));
});

afterEach(async () => {
  await fs.rm(rootDirectory, { force: true, recursive: true });
});

describe("content validation", () => {
  it("passes for a valid project and blog post", async () => {
    await writeValidProject();
    await writeFile(
      "content/blog/example/main.md",
      `---
title: Example
date: 2026-01-01
summary: Example summary.
tags:
  - Architecture
relatedProjects:
  - project-a
published: true
---

# Example

[Read more](/projects/project-a)
`,
    );

    const result = await validateContent(rootDirectory);

    expect(result.issues).toEqual([]);
    expect(result.projects).toBe(1);
    expect(result.blogPosts).toBe(1);
  });

  it("reports invalid project metadata and unsafe markdown URLs", async () => {
    await writeValidProject();
    await writeFile(
      "content/projects/broken-project/meta.json",
      JSON.stringify({
        slug: "wrong-slug",
        title: "Broken",
        category: "Product System",
        summary: "Summary",
        description: "Description",
        tech: ["Next.js"],
        cover: "../secret.png",
        accent: "cyan",
        detailsUrl: "/projects/not-matching",
      }),
    );
    await writeFile("content/projects/broken-project/main.md", "![Bad](javascript:alert(1))");
    await writeFile(
      "content/blog/broken/main.md",
      `---
title: Broken
date: 2026-99-99
summary: Broken summary.
relatedProjects:
  - missing-project
published: true
---

[Bad](javascript:alert(1))
`,
    );

    const result = await validateContent(rootDirectory);
    const messages = result.issues.map((issue) => issue.message);

    expect(messages).toContain('slug must match folder name "broken-project".');
    expect(messages).toContain('detailsUrl must be "/projects/broken-project".');
    expect(messages).toContain("cover path is not allowed: ../secret.png");
    expect(messages).toContain('relatedProjects references missing project "missing-project".');
    expect(messages.some((message) => message.includes("URL is not allowed"))).toBe(true);
  });
});
