"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronLeft, ChevronRight, FilePlus2, LoaderCircle, PanelLeftClose, Search } from "lucide-react";
import { adminRequest } from "@/components/admin/admin-api";
import { cleanProblemTitle, formatProblemUpdatedAt } from "@/lib/leetcode/notebook";
import type { AdminArticleListItem } from "@/types/admin";

type PlannedProblem = { id: number; title: string; round: string };
export type NotebookSelection = { id: number; title: string; difficulty?: "Easy" | "Medium" | "Hard" | null; language?: string };
const control = "notebook-control";

export function LeetCodeNotebookSidebar({ posts, selectedSlug, disabled, loading, error, onOpen, onChoose, onCollapse, onReload }: {
  posts: AdminArticleListItem[];
  selectedSlug: string | null;
  disabled: boolean;
  loading: boolean;
  error: string;
  onOpen: (slug: string) => void;
  onChoose: (problem: NotebookSelection) => void;
  onCollapse: () => void;
  onReload: () => void;
}) {
  const [tab, setTab] = useState<"notebooks" | "plan" | "notes">("notebooks");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState<PlannedProblem[]>([]);
  const [planError, setPlanError] = useState("");
  const [planReload, setPlanReload] = useState(0);
  const [adding, setAdding] = useState(false);
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    let cancelled = false;
    adminRequest<{ plan: { items: PlannedProblem[] } }>("/api/admin/leetcode-plan")
      .then(({ plan }) => { if (!cancelled) { setPlan(plan.items); setPlanError(""); } })
      .catch((cause: unknown) => { if (!cancelled) setPlanError(cause instanceof Error ? cause.message : "無法載入練習順序。"); });
    return () => { cancelled = true; };
  }, [planReload]);

  const byId = useMemo(() => new Map(posts.filter((post) => post.problem?.id).map((post) => [post.problem!.id!, post])), [posts]);
  const next = plan.find((problem) => !byId.has(problem.id));
  const rows = useMemo(() => {
    const source = tab === "plan"
      ? plan.map((problem) => ({ id: problem.id as number | null, title: problem.title, article: byId.get(problem.id), round: problem.round }))
      : posts.filter((post) => tab === "notes" ? post.problem?.entryType === "note" : Boolean(post.problem?.id))
        .sort((a, b) => (a.problem?.id ?? Infinity) - (b.problem?.id ?? Infinity) || a.title.localeCompare(b.title))
        .map((article) => ({ id: article.problem?.id ?? null, title: cleanProblemTitle(article.title, article.problem?.id), article, round: "" }));
    return source.filter((row) => `${row.id ?? ""} ${row.title}`.toLowerCase().includes(query.trim().toLowerCase()));
  }, [tab, plan, byId, posts, query]);
  const pages = Math.max(1, Math.ceil(rows.length / 15));
  const currentPage = Math.min(page, pages);

  function addNotebook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const problemId = Number(id);
    if (disabled || !Number.isInteger(problemId) || problemId < 1 || !title.trim()) return;
    onChoose({ id: problemId, title: title.trim() });
  }

  return <aside className="studio-library notebook-library" aria-label="題本與練習順序">
    <div className="notebook-library-head">
      <div className="flex items-center justify-between gap-2"><h2>我的題本</h2><button aria-label="收合題目清單" className={control} onClick={onCollapse} type="button"><PanelLeftClose size={16} /></button></div>
      <button className={`${control} notebook-create`} disabled={disabled} onClick={() => setAdding((value) => !value)} aria-expanded={adding} type="button"><FilePlus2 size={16} />新增題目</button>
      {adding ? <form className="notebook-add" onSubmit={addNotebook}>
        <label>題號<input required type="number" min="1" max="100000" value={id} onChange={(event) => setId(event.target.value)} /></label>
        <label>題目名稱<input required maxLength={160} value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：Balanced Binary Tree" /></label>
        <button className={control} disabled={disabled} type="submit">建立草稿並開始寫</button>
      </form> : null}
      {next && !adding ? <button className="notebook-next" disabled={disabled || loading} onClick={() => onChoose(next)} type="button">開始下一題 <span>#{next.id} {next.title}</span></button> : null}
      <div className="notebook-tabs" role="group" aria-label="題目來源">
        {([["notebooks", "題本"], ["plan", "練習順序"], ["notes", "筆記"]] as const).map(([value, label]) => <button aria-pressed={tab === value} key={value} onClick={() => { setTab(value); setPage(1); }} type="button">{label}</button>)}
      </div>
      <label className="notebook-search"><Search size={15} aria-hidden="true" /><span className="sr-only">搜尋題號或名稱</span><input type="search" value={query} placeholder="搜尋題號或名稱" onChange={(event) => { setQuery(event.target.value); setPage(1); }} /></label>
    </div>
    {error || (tab === "plan" && planError) ? <div className="notebook-list-message" role="alert"><p>{error || planError}</p><button className={control} onClick={() => { onReload(); setPlanReload((value) => value + 1); }} type="button">重新載入</button></div> : null}
    {loading ? <p className="notebook-list-message" role="status"><LoaderCircle className="animate-spin" size={16} />載入題本…</p> : <ul className="notebook-rows">
      {rows.slice((currentPage - 1) * 15, currentPage * 15).map((row) => <li key={row.article?.slug ?? row.id}>
        <button aria-current={row.article && row.article.slug === selectedSlug ? "true" : undefined} disabled={disabled} onClick={() => row.article ? onOpen(row.article.slug) : onChoose({ id: row.id!, title: row.title })} type="button">
          <span className="notebook-number">{row.id ? `#${row.id}` : "筆記"}</span>
          <span className="notebook-row-copy"><strong>{row.title}</strong><small>{row.article ? `${row.article.published ? "公開" : "草稿"} · ${formatProblemUpdatedAt(row.article.updatedAt)}` : `${row.round} · 點選建立題本`}</small></span>
          {!row.article ? <span aria-hidden="true" className="notebook-add-mark">＋</span> : null}
        </button>
      </li>)}
    </ul>}
    {!loading && !rows.length ? <p className="notebook-list-message">{query ? "沒有符合的題目。" : "從新增題目或練習順序開始。"}</p> : null}
    <div className="notebook-pagination"><span>{rows.length} 筆 · {currentPage} / {pages}</span><div><button className={control} aria-label="題目清單上一頁" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)} type="button"><ChevronLeft size={16} /></button><button className={control} aria-label="題目清單下一頁" disabled={currentPage >= pages} onClick={() => setPage(currentPage + 1)} type="button"><ChevronRight size={16} /></button></div></div>
  </aside>;
}
