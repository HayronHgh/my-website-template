import { z } from "zod";

export const focusSchema = z.object({
  title: z.string().trim().min(1).max(60),
  enabled: z.boolean(),
  items: z.array(z.object({
    title: z.string().trim().min(1).max(80),
    description: z.string().trim().max(240),
    status: z.string().trim().max(30),
    href: z.string().trim().max(500).refine((value) => {
      if (!value) return true;
      if (/[\\\s]/.test(value)) return false;
      if (value.startsWith("/") && !value.startsWith("//")) return true;
      try { return new URL(value).protocol === "https:"; } catch { return false; }
    }, "請使用站內路徑或 HTTPS 網址"),
    linkLabel: z.string().trim().min(1).max(40),
    enabled: z.boolean(),
  }).strict()).max(8),
}).strict();

export type FocusData = z.infer<typeof focusSchema>;
export const defaultFocus: FocusData = { title: "Focus", enabled: true, items: [
  { title: "增生圖神經", description: "探索節點擴張如何影響學習表現。", status: "", href: "/research", linkLabel: "查看研究", enabled: true },
  { title: "PSO", description: "參數選擇與收斂行為。", status: "", href: "/research", linkLabel: "查看研究", enabled: true },
  { title: "ContextOS", description: "", status: "", href: "", linkLabel: "查看內容", enabled: true },
] };
