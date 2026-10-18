import { describe, expect, it } from "vitest";
import { responsiveMermaid, flowchartDeclaration } from "@/lib/content/mermaid-layout";
describe("responsive Mermaid layout", () => {
  it("changes only the root, preserving subgraphs and labels", () => {
    const source = 'flowchart LR\n subgraph S\n direction LR\n A["flowchart LR"] --> B\n end';
    expect(responsiveMermaid(source, "auto", true)).toBe(source.replace(/^flowchart LR/, "flowchart TB"));
    expect(responsiveMermaid(source, "auto", false)).toBe(source);
  });
  it("preserves reverse flow and supports overrides", () => {
    expect(responsiveMermaid("graph RL; A --> B", "auto", true)).toBe("graph BT; A --> B");
    expect(responsiveMermaid("graph BT\n A --> B", "horizontal", true)).toBe("graph RL\n A --> B");
    expect(responsiveMermaid("flowchart TD\n A --> B", "horizontal", false)).toBe("flowchart LR\n A --> B");
  });
  it("supports comments, frontmatter and initialization", () => {
    const prefix = '---\ntitle: Example\n---\n%% comment\n%%{init: {"theme":"dark"}}%%\n';
    expect(responsiveMermaid(prefix + "flowchart LR\n A --> B", "auto", true)).toBe(prefix + "flowchart TB\n A --> B");
  });
  it("does not rewrite other types or malformed declarations", () => {
    for (const source of ["sequenceDiagram\n A->>B: flowchart LR", "classDiagram\n A --> B", "flowchart LRinvalid", "pie\n title flowchart LR"]) {
      expect(flowchartDeclaration(source)).toBeNull();
      expect(responsiveMermaid(source, "vertical", true)).toBe(source);
    }
  });
});
