import { describe, expect, it } from "vitest";
import {
  getBlogAssetUrl,
  getPostAssetFilePath,
  getSlugSegments,
} from "@/lib/blog/assets";
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
});
