import { z } from "zod";
import { remark } from "remark";

export const problemSchema = z.object({
  id: z.number().int().positive().nullable(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]).nullable(),
  status: z.enum(["Todo", "Attempted", "Solved", "Review"]).nullable(),
  language: z.string().trim().min(1).max(40).nullable(),
  entryType: z.enum(["problem", "note", "template"]).optional(),
  format: z.enum(["v1", "legacy"]).optional(),
}).strict().superRefine((value, ctx) => {
  if (!value.entryType || value.entryType === "problem") {
    for (const key of ["id", "difficulty", "status", "language"] as const) {
      if (value[key] === null) ctx.addIssue({ code: "custom", path: [key], message: "題解需要完整題目資料。" });
    }
  } else if (value.id !== null || value.difficulty !== null || value.status !== null || value.language !== null) {
    ctx.addIssue({ code: "custom", message: "學習筆記與模板不應帶有題目進度。" });
  }
});
export type ProblemMetadata = z.infer<typeof problemSchema>;

export function readProblemMetadata(data: Record<string, unknown>) {
  return problemSchema.parse({
    id: data.id, difficulty: data.difficulty, status: data.status, language: data.language,
    ...(data.entryType === undefined ? {} : { entryType: data.entryType }),
    ...(data.format === undefined ? {} : { format: data.format }),
  });
}
export const problemStatusLabels = { Todo: "待解", Attempted: "已嘗試", Solved: "已通過", Review: "待複習" } as const;

export function validateEntryContent(content: string, published: boolean, metadata: ProblemMetadata) {
  if (metadata.entryType === "template" && published) throw new Error("模板只能保留為草稿。");
  if (published && !content.trim()) throw new Error("發布內容不可為空白。");
  if (metadata.entryType === "note" || metadata.entryType === "template" || metadata.format === "legacy") return;
  validateProblemContent(content, published);
}

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
