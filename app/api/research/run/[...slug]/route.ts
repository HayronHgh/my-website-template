import { NextResponse } from "next/server";
import { experimentRequestSchema, runResearchExperiment, validateExperimentParameters } from "@/lib/research/runner";
import { getPublishedResearchEntry, getResearchExperiment } from "@/lib/research/public";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string[] }> }) {
  try {
    const slug = (await params).slug.join("/");
    const [entry, experiment] = await Promise.all([getPublishedResearchEntry(slug), getResearchExperiment(slug)]);
    if (!entry || !experiment) return NextResponse.json({ error: "找不到可執行的研究實驗。" }, { status: 404 });
    const length = Number(request.headers.get("content-length") ?? 0);
    if (!Number.isFinite(length) || length > 16_384) return NextResponse.json({ error: "參數內容過大。" }, { status: 413 });
    const body = experimentRequestSchema.parse(await request.json());
    const values = validateExperimentParameters(experiment.config, body.parameters);
    const result = await runResearchExperiment(experiment.scriptPath, experiment.config, values);
    return NextResponse.json({ result }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "實驗執行失敗。";
    const status = message === "research_runner_disabled" ? 503 : message === "research_runner_busy" ? 429 : 422;
    return NextResponse.json({ error: message === "research_runner_disabled" ? "線上實驗執行器尚未啟用。" : message === "research_runner_busy" ? "實驗執行中，請稍後再試。" : message }, { status });
  }
}
