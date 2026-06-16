import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getBlogAssetUrl,
  getPostAssetFilePath,
  getSlugSegments,
} from "@/lib/blog/assets";
import {
  getSafeResumePdfFilePath,
  getSafeSiteAssetFilePath,
  getSiteAssetUrl,
  getVersionedSiteAssetUrl,
} from "@/lib/site/assets";
import {
  getProjectAssetFilePath,
  getProjectAssetUrl,
  getProjectSlugSegments,
} from "@/lib/projects/assets";

describe("content path helpers", () => {
  it("validates blog and project slug shapes", () => {
    expect(getSlugSegments("series/post")).toEqual(["series", "post"]);
    expect(getSlugSegments("../post")).toBeNull();
    expect(getProjectSlugSegments("project-a")).toEqual(["project-a"]);
    expect(getProjectSlugSegments("series/project-a")).toBeNull();
  });

  it("rewrites safe relative asset URLs", () => {
    expect(getBlogAssetUrl("series/post", "diagram.png")).toBe(
      "/blog/assets/series/post/diagram.png",
    );
    expect(getProjectAssetUrl("project-a", "demo.png")).toBe(
      "/projects/assets/project-a/demo.png",
    );
  });

  it("rejects traversal asset filesystem paths", () => {
    expect(getPostAssetFilePath("post", ["..", "secret.png"])).toBeNull();
    expect(getProjectAssetFilePath("project-a", ["..", "secret.png"])).toBeNull();
  });

  it("limits blog asset filesystem paths to images", () => {
    expect(getPostAssetFilePath("post", ["diagram.png"])).not.toBeNull();
    expect(getPostAssetFilePath("post", ["main.md"])).toBeNull();
    expect(getPostAssetFilePath("series", ["post", "main.md"])).toBeNull();
    expect(getPostAssetFilePath("post", [".env"])).toBeNull();
  });

  it("rewrites and constrains runtime site assets", async () => {
    expect(getSiteAssetUrl("bg.png")).toBe("/site/assets/bg.png");
    expect(getSiteAssetUrl("../secret.png")).toBe("../secret.png");
    await expect(getVersionedSiteAssetUrl("../secret.png")).resolves.toBe("../secret.png");
    await expect(getSafeSiteAssetFilePath(["..", "secret.png"])).resolves.toBeNull();
    await expect(getSafeSiteAssetFilePath(["site.json"])).resolves.toBeNull();
  });

  it("limits resume PDF resolution to the fixed PDF file", async () => {
    const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-assets-"));
    const assetDirectory = path.join(rootDirectory, "assets");
    await fs.mkdir(assetDirectory, { recursive: true });
    await fs.writeFile(path.join(assetDirectory, "resume.pdf"), "%PDF-1.4\n");

    const filePath = await getSafeResumePdfFilePath(["resume.pdf"], assetDirectory);

    expect(filePath).toBe(path.join(assetDirectory, "resume.pdf"));
    await expect(getSafeResumePdfFilePath(["..", "resume.pdf"], assetDirectory)).resolves.toBeNull();
    await expect(getSafeResumePdfFilePath(["resume.txt"], assetDirectory)).resolves.toBeNull();
    await fs.rm(rootDirectory, { force: true, recursive: true });
  });

  it("rejects missing resume PDFs and symlinks outside the asset root", async () => {
    const rootDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "portfolio-assets-"));
    const assetDirectory = path.join(rootDirectory, "assets");
    const outsideDirectory = path.join(rootDirectory, "outside");
    await fs.mkdir(assetDirectory, { recursive: true });
    await fs.mkdir(outsideDirectory, { recursive: true });

    await expect(getSafeResumePdfFilePath(["resume.pdf"], assetDirectory)).resolves.toBeNull();

    const outsidePdf = path.join(outsideDirectory, "resume.pdf");
    const symlinkPath = path.join(assetDirectory, "resume.pdf");
    await fs.writeFile(outsidePdf, "%PDF-1.4\n");

    try {
      await fs.symlink(outsidePdf, symlinkPath);
    } catch {
      await fs.rm(rootDirectory, { force: true, recursive: true });
      return;
    }

    await expect(getSafeResumePdfFilePath(["resume.pdf"], assetDirectory)).resolves.toBeNull();
    await fs.rm(rootDirectory, { force: true, recursive: true });
  });
});
