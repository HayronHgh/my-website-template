import { spawn } from "node:child_process";
import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { z } from "zod";
import { researchExperimentResultSchema, type ResearchExperiment } from "@/lib/research/schema";

const MAX_OUTPUT_BYTES = 256 * 1024;
let activeRuns = 0;

export const experimentRequestSchema = z.object({
  parameters: z.record(z.string(), z.number().finite()),
}).strict();

export function validateExperimentParameters(config: ResearchExperiment, input: Record<string, number>) {
  const expected = new Set(config.parameters.map((parameter) => parameter.key));
  if (Object.keys(input).length !== expected.size || Object.keys(input).some((key) => !expected.has(key))) {
    throw new Error("參數欄位與實驗定義不一致。");
  }
  for (const parameter of config.parameters) {
    const value = input[parameter.key];
    if (!Number.isFinite(value) || value < parameter.min || value > parameter.max) {
      throw new Error(`${parameter.label} 必須介於 ${parameter.min} 與 ${parameter.max} 之間。`);
    }
  }
  return input;
}

export async function runResearchExperiment(scriptPath: string, config: ResearchExperiment, parameters: Record<string, number>) {
  if (process.env.RESEARCH_RUNNER_ENABLED !== "true") throw new Error("research_runner_disabled");
  if (activeRuns >= 2) throw new Error("research_runner_busy");
  activeRuns += 1;
  try {
    return await new Promise<unknown>((resolve, reject) => {
      const child = spawn(process.execPath, ["--max-old-space-size=128", scriptPath], {
        cwd: process.cwd(),
        env: {
          NODE_ENV: process.env.NODE_ENV,
          PATH: process.env.PATH,
          SYSTEMROOT: process.env.SYSTEMROOT,
        },
        shell: false,
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      }) as ChildProcessWithoutNullStreams;
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let size = 0;
      let finished = false;
      const stop = (error: Error) => {
        if (finished) return;
        finished = true;
        child.kill("SIGKILL");
        reject(error);
      };
      const timer = setTimeout(() => stop(new Error("research_runner_timeout")), config.timeoutMs);
      child.stdout.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_OUTPUT_BYTES) stop(new Error("research_output_too_large"));
        else stdout.push(chunk);
      });
      child.stderr.on("data", (chunk: Buffer) => {
        size += chunk.length;
        if (size > MAX_OUTPUT_BYTES) stop(new Error("research_output_too_large"));
        else stderr.push(chunk);
      });
      child.on("error", (error) => stop(error));
      child.on("close", (code) => {
        clearTimeout(timer);
        if (finished) return;
        finished = true;
        if (code !== 0) return reject(new Error(Buffer.concat(stderr).toString("utf8").trim() || `Experiment exited with ${code}.`));
        try { resolve(researchExperimentResultSchema.parse(JSON.parse(Buffer.concat(stdout).toString("utf8")))); }
        catch { reject(new Error("實驗程式必須在 stdout 輸出符合播放器契約的 JSON 物件。")); }
      });
      child.stdin.end(JSON.stringify({ parameters }));
    });
  } finally {
    activeRuns -= 1;
  }
}
