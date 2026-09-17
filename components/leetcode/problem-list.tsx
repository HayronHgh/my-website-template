"use client";
import { useState } from "react";
import Link from "next/link";
import type { ProblemMetadata } from "@/lib/leetcode/schema";

export type PublicProblem = ProblemMetadata & { slug: string; title: string; tags: string[]; summary: string };
export function ProblemList({ problems }: { problems: PublicProblem[] }) {
  const [query, setQuery] = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [status, setStatus] = useState("");
  const [tag, setTag] = useState("");
  const tags = [...new Set(problems.flatMap((p) => p.tags))].sort();
  const filtered = problems.filter((p) =>
    (!difficulty || p.difficulty === difficulty) && (!status || p.status === status) &&
    (!tag || p.tags.includes(tag)) &&
    [p.id, p.title, ...p.tags].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <div className="content-panel">
    <div className="content-filters">
      <label>搜尋題目<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="題號、題名或標籤" type="search" /></label>
      <label>難度<select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}><option value="">全部難度</option>{["Easy","Medium","Hard"].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label>進度<select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">全部進度</option>{["Todo","Attempted","Solved","Review"].map((v) => <option key={v}>{v}</option>)}</select></label>
      <label>主題<select value={tag} onChange={(e) => setTag(e.target.value)}><option value="">全部主題</option>{tags.map((v) => <option key={v}>{v}</option>)}</select></label>
    </div>
    <p className="content-caption" role="status">{filtered.length} 題 · 題號排序</p>
    {!filtered.length ? <div className="content-empty"><h2>{problems.length ? "沒有符合條件的題目" : "解題紀錄準備中"}</h2><p>{problems.length ? "試著調整搜尋或篩選條件。" : "發布題解後，這裡會呈現解法、複雜度分析與複習筆記。"}</p></div> :
      <div className="problem-list">{filtered.map((p) => <Link className="problem-row" href={`/leetcode/${p.slug.split("/").map(encodeURIComponent).join("/")}`} key={p.slug}>
        <span className="content-caption">#{p.id}</span><div><h2>{p.title}</h2><p>{p.tags.join(" / ")}</p></div>
        <span data-difficulty={p.difficulty}>{p.difficulty}</span><span>{p.status}</span>
      </Link>)}</div>}
  </div>;
}
