import { describe, expect, it } from "vitest";
import { ProjectCard } from "@/components/projects/project-card";
import { getProjectCoverStyle } from "@/lib/projects/cover-style";
import type { ProjectItem } from "@/data/site";

const project: ProjectItem = {
  slug: "cover-test", title: "Cover test", category: "Test", summary: "Summary",
  description: "Description", tech: [], cover: "cover.webp", coverPosition: "center",
  accent: "cyan", detailsUrl: "/projects/cover-test",
};

describe("project cover appearance", () => {
  it("uses original image colors in the shared card/detail style", () => {
    const style = getProjectCoverStyle('/cover with spaces.webp', "50% 25%");
    expect(style).toEqual({ backgroundImage: 'url("/cover with spaces.webp")',
      backgroundPosition: "50% 25%", backgroundSize: "contain", boxShadow: "none" });
    expect(getProjectCoverStyle(undefined, "center")).toEqual({ backgroundPosition: "center" });
  });
  it("shows uploaded covers without a gradient, inset shadow or brightness filter", () => {
    const card = ProjectCard({ project });
    const preview = card.props.children[0];
    expect(preview.props.style).toMatchObject({
      backgroundImage: 'url("/projects/assets/cover-test/cover.webp")',
      backgroundPosition: "center", backgroundSize: "contain", boxShadow: "none",
    });
    expect(preview.props.className).not.toContain("brightness");
  });

  it("preserves generated placeholder styling", () => {
    const card = ProjectCard({ project: { ...project, cover: "generated:test" } });
    const preview = card.props.children[0];
    expect(preview.props.style).toEqual({ backgroundPosition: "center" });
    expect(preview.props.className).toContain("group-hover:brightness-110");
  });
});
