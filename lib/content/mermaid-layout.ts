export type DiagramLayout = "auto" | "horizontal" | "vertical";
export function flowchartDeclaration(source: string) {
  const prefix = /^(?:\s+|%%\{[\s\S]*?\}%%\s*|%%[^\n]*(?:\n|$)|---\r?\n[\s\S]*?\r?\n---\s*)*/.exec(source)?.[0] ?? "";
  const match = /^(flowchart|graph)[ \t]+(LR|RL|TB|TD|BT)(?=\s|;|$)/.exec(source.slice(prefix.length));
  return match ? { start: prefix.length, declaration: match[0], kind: match[1], direction: match[2] } : null;
}
export function responsiveMermaid(source: string, layout: DiagramLayout, narrow: boolean) {
  const header = flowchartDeclaration(source);
  if (!header || (layout === "auto" && !narrow)) return source;
  const reverse = header.direction === "RL" || header.direction === "BT";
  const direction = layout === "horizontal" ? (reverse ? "RL" : "LR") : (reverse ? "BT" : "TB");
  return source.slice(0, header.start) + `${header.kind} ${direction}` + source.slice(header.start + header.declaration.length);
}
