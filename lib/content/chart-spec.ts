import { z } from "zod";

export const chartTypes = ["bar", "pie", "line"] as const;
export type ChartType = typeof chartTypes[number];
export const chartTypeLabels: Record<ChartType, string> = {
  bar: "柱狀圖", pie: "圓餅圖", line: "折線圖",
};

const label = z.string().trim().min(1).max(60);
const chartSchema = z.object({
  type: z.enum(chartTypes),
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  unit: z.string().trim().max(20).optional(),
  labels: z.array(label).min(1).max(24),
  series: z.array(z.object({
    name: label,
    values: z.array(z.number().finite().min(-1e12).max(1e12)).min(1).max(24),
  }).strict()).min(1).max(4),
}).strict().superRefine((chart, context) => {
  if (chart.series.some((series) => series.values.length !== chart.labels.length)) {
    context.addIssue({ code: "custom", message: "每組 values 的數量必須與 labels 一致。" });
  }
  if (chart.type === "pie" && (chart.series.length !== 1 ||
      chart.series[0].values.some((value) => value < 0) ||
      chart.series[0].values.reduce((sum, value) => sum + value, 0) <= 0)) {
    context.addIssue({ code: "custom", message: "圓餅圖只能有一組資料，數值不可為負，合計必須大於 0。" });
  }
});

export type ChartSpec = z.infer<typeof chartSchema>;

export function parseChart(source: string): ChartSpec {
  if (source.length > 40_000) throw new Error("圖表資料不可超過 40,000 字元。");
  let data: unknown;
  try { data = JSON.parse(source); }
  catch { throw new Error("請使用有效的 JSON：欄位名稱與文字使用雙引號，最後一項後不要加逗號。"); }
  const result = chartSchema.safeParse(data);
  if (!result.success) {
    const custom = result.error.issues.find((issue) => issue.code === "custom");
    throw new Error(custom?.message ?? "請檢查 type、title、labels 與 series：最多 24 個標籤、4 組資料；數值須為 -1e12 至 1e12 的數字，不能是字串。不要加入額外欄位。");
  }
  return result.data;
}

export function createChartSnippet(type: ChartType) {
  const chart: ChartSpec = type === "pie" ? {
    type, title: "練習題型分布", unit: "題",
    description: "範例資料，請改成自己的統計。",
    labels: ["陣列", "字串", "動態規劃"],
    series: [{ name: "完成題數", values: [18, 12, 6] }],
  } : {
    type, title: type === "bar" ? "每週完成題數" : "每週練習趨勢", unit: "題",
    description: "範例資料，請改成自己的統計。",
    labels: ["第一週", "第二週", "第三週", "第四週"],
    series: [{ name: "完成題數", values: [8, 12, 10, 16] }],
  };
  return "```chart\n" + JSON.stringify(chart, null, 2) + "\n```";
}
