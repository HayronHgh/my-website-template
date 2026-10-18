import type { ProblemMetadata } from "@/lib/leetcode/schema";
import { cleanProblemTitle } from "@/lib/leetcode/notebook";

export const PROBLEMS_PER_PAGE = 15;
export type PublicProblem = ProblemMetadata & { slug: string; title: string; tags: string[]; summary: string; updatedAt: string };
export type ProblemSearchParams = Record<string, string | string[] | undefined>;

export function paginateProblems(problems: PublicProblem[], params: ProblemSearchParams) {
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  const category = value("category") === "note" ? "note" : "problem";
  const query = value("q").trim().slice(0, 100);
  const difficulty = ["Easy", "Medium", "Hard"].includes(value("difficulty")) ? value("difficulty") : "";
  const tag = value("tag").slice(0, 100);
  const filtered = problems.filter((problem) =>
    (problem.entryType ?? "problem") === category &&
    (category === "note" || !difficulty || problem.difficulty === difficulty) &&
    (!tag || problem.tags.includes(tag)) &&
    [problem.id, problem.title, ...problem.tags].join(" ").toLowerCase().includes(query.toLowerCase()),
  );
  filtered.sort((a, b) => (a.id ?? Infinity) - (b.id ?? Infinity) || a.slug.localeCompare(b.slug));
  const pageCount = Math.max(1, Math.ceil(filtered.length / PROBLEMS_PER_PAGE));
  const requestedPage = /^\d{1,9}$/.test(value("page")) ? Number(value("page")) : 1;
  const page = Math.min(pageCount, Math.max(1, requestedPage));
  const start = (page - 1) * PROBLEMS_PER_PAGE;
  return {
    category, difficulty, tag, query, page, pageCount,
    end: Math.min(start + PROBLEMS_PER_PAGE, filtered.length),
    items: filtered.slice(start, start + PROBLEMS_PER_PAGE).map((problem) => ({ ...problem, title: cleanProblemTitle(problem.title, problem.id) })),
    noteCount: problems.filter((problem) => problem.entryType === "note").length,
    problemCount: problems.filter((problem) => (problem.entryType ?? "problem") === "problem").length,
    start: filtered.length ? start + 1 : 0,
    tags: [...new Set(problems.flatMap((problem) => problem.tags))].sort(),
    total: filtered.length,
  };
}

export type ProblemPage = ReturnType<typeof paginateProblems>;

export function problemPageHref(result: ProblemPage, page: number, category = result.category) {
  const params = new URLSearchParams();
  if (category === "note") params.set("category", "note");
  if (result.query) params.set("q", result.query);
  if (result.difficulty) params.set("difficulty", result.difficulty);
  if (result.tag) params.set("tag", result.tag);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/leetcode?${query}` : "/leetcode";
}
