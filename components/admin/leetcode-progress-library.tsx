"use client";

import { useEffect, useMemo, useState } from "react";
import { adminRequest } from "@/components/admin/admin-api";
import { PixelCard } from "@/components/ui/pixel-card";
import { problemStatusLabels, type ProblemMetadata } from "@/lib/leetcode/schema";
import { previouslyCompletedProblems } from "@/lib/leetcode/practice-history";
import { encodeBlogSlugPath } from "@/lib/blog/slug";
import type { AdminArticle, AdminArticleListItem } from "@/types/admin";

type Progress = NonNullable<ProblemMetadata["status"]>;
type Filter = "all" | "history" | Progress;
const control = "rounded border border-[#30445f] bg-[#0b1220] px-3 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50";

export function LeetCodeProgressLibrary({
  disabled,
  refreshKey,
  selectedSlug,
  onOpen,
  onUpdated,
}: {
  disabled: boolean;
  refreshKey: string;
  selectedSlug: string | null;
  onOpen: (slug: string) => void;
  onUpdated: (slugs: string[]) => void;
}) {
  const [articles, setArticles] = useState<AdminArticleListItem[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let cancelled = false;
    adminRequest<{ posts: AdminArticleListItem[] }>("/api/admin/leetcode?status=all")
      .then(({ posts }) => {
        if (!cancelled) {
          setArticles(posts.filter((post) => post.problem?.id).sort((a, b) => a.problem!.id! - b.problem!.id!));
          setError("");
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "無法載入題解清單。");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [refreshKey, reload]);

  const visible = useMemo(() => articles.filter((article) => {
    if (filter === "history" && !previouslyCompletedProblems.has(article.problem!.id!)) return false;
    if (filter !== "all" && filter !== "history" && article.problem?.status !== filter) return false;
    const text = `${article.problem?.id} ${article.title} ${article.tags.join(" ")}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  }), [articles, filter, query]);

  // Only reconcile legacy Attempted values. Preserve explicit review/todo choices.
  const pendingHistory = articles.filter((article) =>
    previouslyCompletedProblems.has(article.problem!.id!) && article.problem?.status === "Attempted",
  );

  async function changeProgress(targets: AdminArticleListItem[], status: Progress) {
    if (disabled || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const updated: string[] = [];
    try {
      for (const target of targets) {
        const { article } = await adminRequest<{ article: AdminArticle }>(
          `/api/admin/leetcode/${encodeBlogSlugPath(target.slug)}`,
          { method: "PATCH", body: JSON.stringify({ revision: target.revision, status }) },
        );
        updated.push(article.slug);
        setArticles((current) => current.map((item) => item.slug === article.slug ? article : item));
      }
      setNotice(`已更新 ${updated.length} 題為「${problemStatusLabels[status]}」，進度已寫入題解文章。`);
    } catch (cause) {
      setError(`${updated.length ? `已更新 ${updated.length} 題。` : ""}${cause instanceof Error ? cause.message : "進度更新失敗。"} 請重新載入清單後再試。`);
    } finally {
      setBusy(false);
      if (updated.length) onUpdated(updated);
    }
  }

  return (
    <PixelCard as="section" className="mb-6" aria-labelledby="problem-library-title" aria-busy={busy || loading}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-50" id="problem-library-title">題目進度與文章</h2>
          <p className="mt-1 text-sm text-slate-400">已收錄 {articles.length} 題；原刷題表完成 51 題。點選編輯題解，可在下方直接更新文章。</p>
        </div>
        <button className={control} disabled={busy} onClick={() => setReload((value) => value + 1)} type="button">重新載入清單</button>
      </div>
      {pendingHistory.length ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-l-2 border-amber-300 bg-amber-950/15 p-3">
          <p className="max-w-2xl text-sm text-amber-100">{pendingHistory.length} 題在原表已完成，文章仍為「已嘗試」。可依原表整理成「已通過」。</p>
          <button className={control} disabled={disabled || busy} onClick={() => {
            if (window.confirm(`依原刷題表，將這 ${pendingHistory.length} 題的文章進度更新為已通過？`)) void changeProgress(pendingHistory, "Solved");
          }} type="button">依原表整理進度</button>
        </div>
      ) : null}
      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "history", "Solved", "Review", "Attempted", "Todo"] as const).map((value) => (
          <button aria-pressed={filter === value} className={`${control} ${filter === value ? "border-cyan-300 text-cyan-100" : ""}`} key={value} onClick={() => setFilter(value)} type="button">
            {value === "all" ? "全部題目" : value === "history" ? "原表已完成" : problemStatusLabels[value]}
          </button>
        ))}
        <label className="ml-auto"><span className="sr-only">搜尋題號、題名或標籤</span><input className={control} onChange={(event) => setQuery(event.target.value)} placeholder="搜尋題號、題名或標籤" type="search" value={query} /></label>
      </div>
      {disabled ? <p className="mt-3 text-xs text-amber-100">文章編輯或儲存中；儲存完成後即可快速切換進度。</p> : null}
      <div aria-live="polite" className="mt-3 text-sm">
        {notice ? <p className="text-cyan-100">{notice}</p> : null}
        {error ? <p className="text-rose-200" role="alert">{error}</p> : null}
      </div>
      <div className="mt-3 max-h-[30rem] overflow-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="sticky top-0 bg-[#0b1220] text-slate-400"><tr><th className="p-3">題目</th><th className="p-3">進度</th><th className="p-3">文章</th></tr></thead>
          <tbody>
            {visible.map((article) => (
              <tr className={`border-t border-[#26344d] ${selectedSlug === article.slug ? "bg-cyan-950/25" : ""}`} key={article.slug}>
                <td className="p-3"><p className="font-medium text-slate-100">#{article.problem!.id} {article.title}</p><p className="mt-1 text-xs text-slate-400">{article.problem?.difficulty}{previouslyCompletedProblems.has(article.problem!.id!) ? " · 原表已完成" : ""}</p></td>
                <td className="p-3"><select aria-label={`題號 ${article.problem!.id} 進度`} className={control} disabled={disabled || busy} onChange={(event) => void changeProgress([article], event.target.value as Progress)} value={article.problem?.status ?? "Attempted"}>{Object.entries(problemStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td>
                <td className="p-3"><button className={control} disabled={busy} onClick={() => onOpen(article.slug)} type="button">{selectedSlug === article.slug ? "繼續編輯" : "編輯題解"}</button><span className="ml-2 text-xs text-slate-400">{article.published ? "公開" : "草稿"}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && !visible.length ? <p className="p-4 text-sm text-slate-400">沒有符合條件的題目，請切換篩選或搜尋文字。</p> : null}
      </div>
    </PixelCard>
  );
}
