import { z } from "zod";
import { remark } from "remark";

export const problemSchema = z.object({
  id: z.number().int().positive(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  status: z.enum(["Todo", "Attempted", "Solved", "Review"]),
  language: z.string().trim().min(1).max(40),
}).strict();
export type ProblemMetadata = z.infer<typeof problemSchema>;

export const problemSections = [
  "題目與限制", "我的直覺", "解法與程式碼", "正確性分析",
  "時間複雜度", "空間複雜度", "邊界測試", "優化與替代解法", "參考與複習筆記",
] as const;
export const problemTemplate = problemSections.map((heading) => `## ${heading}\n\n`).join("\n");

export function validateProblemContent(content: string, published: boolean) {
  if (!published) return;
  const nodes = remark().parse(content).children;
  const missing = problemSections.filter((heading) => {
    const index = nodes.findIndex((node) => node.type === "heading" && node.depth === 2 &&
      node.children.map((child) => "value" in child ? child.value : "").join("") === heading);
    return index < 0 || !nodes[index + 1] || nodes[index + 1].type === "heading";
  });
  if (missing.length) throw new Error(`發布前請補齊段落：${missing.join("、")}`);
}
