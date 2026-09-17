"use client";
import { useState } from "react";
import Link from "next/link";
import type { ProblemMetadata } from "@/lib/leetcode/schema";
import { problemStatusLabels } from "@/lib/leetcode/schema";

export type PublicProblem = ProblemMetadata & { slug: string; title: string; tags: string[]; summary: string };
export function ProblemList({ problems }: { problems: PublicProblem[] }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const [category, setCategory] = useState<"problem" | "note">("problem");
  const tags = [...new Set(problems.flatMap((p) => p.tags))].sort();
  const filtered = problems.filter((p) =>
    (p.entryType ?? "problem") === category &&
    (category === "note" || ((!difficulty || p.difficulty === difficulty) && (!status || p.status === status))) &&
    (!tag || p.tags.includes(tag)) &&
    [p.id, p.title, ...p.tags].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="content-panel">
    <div className="workspace-actions" aria-label="內容分類">
      <button aria-pressed={category === "problem"} onClick={() => setCategory("problem")}>題解 · {problems.filter((p) => (p.entryType ?? "problem") === "problem").length}</button>
      <button aria-pressed={category === "note"} onClick={() => setCategory("note")}>學習筆記 · {problems.filter((p) => p.entryType === "note").length}</button>
    </div>
    <div className="content-filters">
      <label>搜尋題目<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="題號、題名或標籤" type="search" /></label>
      <label>難度<select disabled={category === "note"} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">全部難度</option>{["Easy","Medium","Hard"].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label>進度<select disabled={category === "note"} value={status} onChange={(e) => setStatus(e.target.value)}><option value="">全部進度</option>{Object.entries(problemStatusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>主題<select value={tag} onChange={(e) => setTag(e.target.value)}><option value="">全部主題</option>{tags.map((v) => <option key={v}>{v}</option>)}</select></label>
    </div>
    <p className="content-caption" role="status">{filtered.length} {category === "problem" ? "題 · 題號排序" : "篇學習筆記"}</p>
    {!filtered.length ? <div className="content-empty"><h2>{problems.length ? "沒有符合條件的題目" : "解題紀錄準備中"}</h2><p>{problems.length ? "試著調整搜尋或篩選條件。" : "發布題解後，這裡會呈現解法、複雜度分析與複習筆記。"}</p></div> :
      <div className="problem-list">{filtered.map((p) => <Link className="problem-row" href={`/leetcode/${p.slug.split("/").map(encodeURIComponent).join("/")}`} key={p.slug}>
        <span className="content-caption">{p.id === null ? "筆記" : `#${p.id}`}</span><div><h2>{p.title}</h2><p>{p.tags.join(" / ")}</p></div>
        <span data-difficulty={p.difficulty ?? undefined}>{p.difficulty ?? "—"}</span><span>{p.status ? problemStatusLabels[p.status] : "—"}</span>
      </Link>)}</div>}
  </div>;
}
