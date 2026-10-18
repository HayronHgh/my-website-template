import { describe, expect, it } from "vitest";
import { paginateProblems, problemPageHref, type PublicProblem } from "@/lib/leetcode/problem-pagination";

const problems: PublicProblem[] = Array.from({ length: 31 }, (_, index) => ({
  id: index + 1, title: `Problem ${index + 1}`, slug: `problem-${index + 1}`,
  tags: [index % 2 ? "tree" : "array"], summary: "", difficulty: "Easy",
  status: "Solved", language: "Python", entryType: "problem",
}));

describe("public problem pagination", () => {
  it("returns 15 items per full page and the remainder on the last page", () => {
    expect(paginateProblems(problems, {}).items.map((item) => item.id)).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    const second = paginateProblems(problems, { page: "2" });
    expect(second.items.map((item) => item.id)).toEqual(Array.from({ length: 15 }, (_, i) => i + 16));
    expect(second).toMatchObject({ total: 31, start: 16, end: 30, pageCount: 3 });
    expect(paginateProblems(problems, { page: "3" }).items.map((item) => item.id)).toEqual([31]);
  });

  it("filters before paginating and preserves conditions in page URLs", () => {
    const result = paginateProblems(problems, { tag: "array", status: "Solved", q: "Problem", page: "2" });
    expect(result).toMatchObject({ total: 16, pageCount: 2, start: 16, end: 16 });
    expect(result.items[0].id).toBe(31);
    expect(problemPageHref(result, 1)).toBe("/leetcode?q=Problem&status=Solved&tag=array");
  });

  it("bounds page numbers and handles no matches", () => {
    for (const page of ["0", "-3", "NaN", "Infinity", "1.5"]) expect(paginateProblems(problems, { page }).page).toBe(1);
    expect(paginateProblems(problems, { page: "999" }).page).toBe(3);
    expect(paginateProblems(problems, { q: "missing", page: "3" })).toMatchObject({ page: 1, total: 0, start: 0, end: 0, items: [] });
  });

  it("paginates notes without difficulty or progress constraints", () => {
    const note: PublicProblem = { ...problems[0], id: null, entryType: "note", slug: "notes/plan", difficulty: null, status: null, language: null };
    expect(paginateProblems([...problems, note], { category: "note", status: "Solved", difficulty: "Hard" })).toMatchObject({ total: 1, noteCount: 1, problemCount: 31, items: [note] });
  });
});
