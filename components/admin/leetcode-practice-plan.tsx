"use client";

import {
  Check,
  ChevronDown,
  ChevronUp,
  Circle,
  ExternalLink,
  ListOrdered,
  LoaderCircle,
  Plus,
  RotateCcw,
  SkipForward,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { adminRequest, AdminClientError } from "@/components/admin/admin-api";
import { NeonButton } from "@/components/ui/neon-button";
import { PixelCard } from "@/components/ui/pixel-card";

type PlanItem = {
  article: {
    published: boolean;
    slug: string;
    status: string | null;
  } | null;
  completed: boolean;
  completedAt: string | null;
  id: number;
  round: string;
  title: string;
};

type PracticePlan = {
  items: PlanItem[];
  revision: string;
  title: string;
  updatedAt: string | null;
};

const actionButtonClass =
  "inline-flex min-h-9 items-center justify-center gap-1.5 rounded border border-[#30445f] bg-[#0b1220] px-3 py-2 text-xs font-bold text-slate-200 transition hover:border-[#6ea8b0] hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60 disabled:cursor-not-allowed disabled:opacity-45";

function errorMessage(error: unknown) {
  return error instanceof AdminClientError ? error.message : "無法更新刷題順序，請稍後再試。";
}

export function LeetCodePracticePlan({ refreshKey, onOpenArticle }: {
  refreshKey: string;
  onOpenArticle: (slug: string) => void;
}) {
  const [plan, setPlan] = useState<PracticePlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [newId, setNewId] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newRound, setNewRound] = useState("第六輪");

  const loadPlan = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await adminRequest<{ plan: PracticePlan }>("/api/admin/leetcode-plan");
      setPlan(data.plan);
    } catch (loadError) {
      setError(errorMessage(loadError));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    adminRequest<{ plan: PracticePlan }>("/api/admin/leetcode-plan")
      .then((data) => {
        if (!cancelled) setPlan(data.plan);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) setError(errorMessage(loadError));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const saveItems = useCallback(
    async (items: PlanItem[], successMessage: string) => {
      if (!plan || isSaving) return;
      setIsSaving(true);
      setError("");
      setMessage("");

      try {
        const data = await adminRequest<{ plan: PracticePlan }>("/api/admin/leetcode-plan", {
          body: JSON.stringify({
            items: items.map((item) => ({
              completed: item.completed,
              completedAt: item.completedAt,
              id: item.id,
              round: item.round,
              title: item.title,
            })),
            revision: plan.revision,
          }),
          method: "PUT",
        });
        setPlan(data.plan);
        setMessage(successMessage);
      } catch (saveError) {
        setError(errorMessage(saveError));
        if (saveError instanceof AdminClientError && saveError.status === 409) {
          await loadPlan();
        }
      } finally {
        setIsSaving(false);
      }
    },
    [isSaving, loadPlan, plan],
  );

  const nextIndex = useMemo(
    () => plan?.items.findIndex((item) => !item.completed) ?? -1,
    [plan],
  );
  const nextItem = nextIndex >= 0 ? plan?.items[nextIndex] : null;
  const completedCount = plan?.items.filter((item) => item.completed).length ?? 0;
  const progress = plan?.items.length ? Math.round((completedCount / plan.items.length) * 100) : 0;

  function completeNext() {
    if (!plan || nextIndex < 0) return;
    const items = plan.items.map((item, index) =>
      index === nextIndex
        ? { ...item, completed: true, completedAt: new Date().toISOString() }
        : item,
    );
    void saveItems(items, `已完成 #${plan.items[nextIndex].id}，下一題已更新。`);
  }

  function deferNext() {
    if (!plan || nextIndex < 0) return;
    const items = [...plan.items];
    const [deferred] = items.splice(nextIndex, 1);
    items.push(deferred);
    void saveItems(items, `已將 #${deferred.id} 移到目前清單最後。`);
  }

  function toggleCompleted(index: number) {
    if (!plan) return;
    const target = plan.items[index];
    const items = plan.items.map((item, itemIndex) =>
      itemIndex === index
        ? {
            ...item,
            completed: !item.completed,
            completedAt: item.completed ? null : new Date().toISOString(),
          }
        : item,
    );
    void saveItems(items, `已將 #${target.id} 標記為${target.completed ? "待練習" : "已完成"}。`);
  }

  function moveItem(index: number, direction: -1 | 1) {
    if (!plan) return;
    const destination = index + direction;
    if (destination < 0 || destination >= plan.items.length) return;
    const items = [...plan.items];
    const movedId = items[index].id;
    [items[index], items[destination]] = [items[destination], items[index]];
    void saveItems(items, `已調整 #${movedId} 的練習順序。`);
  }

  function removeItem(index: number) {
    if (!plan || plan.items.length === 1) return;
    const target = plan.items[index];
    if (!window.confirm(`要從刷題順序移除 #${target.id} ${target.title} 嗎？題解文章不會被刪除。`)) {
      return;
    }
    void saveItems(
      plan.items.filter((_, itemIndex) => itemIndex !== index),
      `已從順序移除 #${target.id}；題解文章仍保留。`,
    );
  }

  function resetRound() {
    if (!plan || !window.confirm("要把全部題目改為待練習，開始新一輪嗎？目前排序會保留。")) return;
    void saveItems(
      plan.items.map((item) => ({ ...item, completed: false, completedAt: null })),
      "已開始新一輪，全部題目改為待練習。",
    );
  }

  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!plan) return;
    const id = Number(newId);
    if (!Number.isInteger(id) || id <= 0 || !newTitle.trim() || !newRound.trim()) {
      setError("請填寫有效題號、題名與輪次。");
      return;
    }
    if (plan.items.some((item) => item.id === id)) {
      setError(`題號 #${id} 已在清單中。`);
      return;
    }

    void saveItems(
      [
        ...plan.items,
        {
          article: null,
          completed: false,
          completedAt: null,
          id,
          round: newRound.trim(),
          title: newTitle.trim(),
        },
      ],
      `已加入 #${id} ${newTitle.trim()}。`,
    );
    setNewId("");
    setNewTitle("");
  }

  if (isLoading) {
    return (
      <PixelCard as="section" className="mb-6 flex min-h-44 items-center justify-center" aria-busy="true">
        <LoaderCircle aria-hidden="true" className="h-6 w-6 animate-spin text-cyan-200" />
        <span className="ml-3 text-sm text-slate-300">載入刷題順序…</span>
      </PixelCard>
    );
  }

  if (!plan) {
    return (
      <PixelCard as="section" className="mb-6 border-rose-400/35">
        <p className="text-sm text-rose-100" role="alert">{error || "無法載入刷題順序。"}</p>
        <button className={`${actionButtonClass} mt-3`} onClick={() => void loadPlan()} type="button">
          重新載入
        </button>
      </PixelCard>
    );
  }

  return (
    <PixelCard as="section" className="mb-6 p-0" aria-labelledby="practice-plan-title">
      <div className="grid gap-0 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-[#8ed2d8]">
                <ListOrdered aria-hidden="true" className="h-4 w-4" />
                持續刷題順序
              </div>
              <h2 className="mt-2 font-mono text-lg font-black text-slate-50" id="practice-plan-title">
                {plan.title}
              </h2>
            </div>
            <span className="rounded border border-[#30445f] bg-[#0b1220] px-3 py-1.5 font-mono text-xs text-slate-300">
              {completedCount} / {plan.items.length} 完成
            </span>
          </div>

          {nextItem ? (
            <div className="mt-5 border-l-4 border-cyan-300 bg-[#091624] px-5 py-5">
              <p className="text-sm text-slate-400">下一題</p>
              <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-3xl font-black text-cyan-100">#{nextItem.id}</span>
                <h3 className="text-lg font-bold text-slate-50">{nextItem.title}</h3>
              </div>
              <p className="mt-2 text-sm text-slate-400">{nextItem.round}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <NeonButton disabled={isSaving} onClick={completeNext}>
                  {isSaving ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <Check aria-hidden="true" className="h-4 w-4" />}
                  完成並前往下一題
                </NeonButton>
                <button className={actionButtonClass} disabled={isSaving} onClick={deferNext} type="button">
                  <SkipForward aria-hidden="true" className="h-4 w-4" />
                  稍後再做
                </button>
                {nextItem.article ? (
                  <button className={actionButtonClass} onClick={() => onOpenArticle(nextItem.article!.slug)} type="button">
                    編輯題解
                    <ExternalLink aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="mt-5 border-l-4 border-emerald-300 bg-emerald-950/20 px-5 py-5">
              <h3 className="text-lg font-bold text-emerald-100">這一輪全部完成</h3>
              <p className="mt-1 text-sm text-emerald-100/70">可以開始新一輪，排序會保留。</p>
            </div>
          )}
        </div>

        <div className="border-t border-[#26344d] bg-[#080f1c] p-5 xl:border-l xl:border-t-0">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-400">本輪進度</p>
              <p className="mt-1 font-mono text-3xl font-black text-slate-50">{progress}%</p>
            </div>
            <Circle aria-hidden="true" className="h-7 w-7 text-cyan-200" fill="currentColor" fillOpacity={progress / 100} />
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#19263a]" aria-label={`本輪進度 ${progress}%`} role="progressbar" aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress}>
            <div className="h-full bg-cyan-300" style={{ width: `${progress}%` }} />
          </div>
          <div className="mt-5 grid gap-2">
            <button className={actionButtonClass} disabled={isSaving} onClick={() => setIsExpanded((value) => !value)} type="button">
              <ListOrdered aria-hidden="true" className="h-4 w-4" />
              {isExpanded ? "收合完整順序" : "管理完整順序"}
            </button>
            <button className={actionButtonClass} disabled={isSaving} onClick={resetRound} type="button">
              <RotateCcw aria-hidden="true" className="h-4 w-4" />
              開始新一輪
            </button>
          </div>
        </div>
      </div>

      {message || error ? (
        <div className="border-t border-[#26344d] px-5 py-3 text-sm" aria-live="polite">
          {message ? <p className="text-cyan-100">{message}</p> : null}
          {error ? <p className="text-rose-200" role="alert">{error}</p> : null}
        </div>
      ) : null}

      {isExpanded ? (
        <div className="border-t border-[#26344d] p-5 sm:p-6">
          <div className="overflow-x-auto">
            <ol className="min-w-[42rem] space-y-2">
              {plan.items.map((item, index) => (
                <li className={`grid grid-cols-[3rem_1fr_auto] items-center gap-3 rounded border px-3 py-2 ${item.completed ? "border-emerald-400/20 bg-emerald-950/10" : index === nextIndex ? "border-cyan-300/50 bg-cyan-950/20" : "border-[#26344d] bg-[#0a1220]"}`} key={item.id}>
                  <span className="font-mono text-sm text-slate-400">{String(index + 1).padStart(2, "0")}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button className="flex min-w-0 items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60" disabled={isSaving} onClick={() => toggleCompleted(index)} type="button">
                        {item.completed ? <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-emerald-300" /> : <Circle aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-500" />}
                        <span className={`font-mono font-bold ${item.completed ? "text-slate-400 line-through" : "text-slate-100"}`}>#{item.id}</span>
                        <span className={`truncate ${item.completed ? "text-slate-500" : "text-slate-300"}`}>{item.title}</span>
                      </button>
                      <span className="rounded border border-[#30445f] px-2 py-0.5 text-[11px] text-slate-400">{item.round}</span>
                      {item.article ? <button className="text-xs text-[#8ed2d8] underline focus-visible:ring-2 focus-visible:ring-cyan-300" onClick={() => onOpenArticle(item.article!.slug)} type="button">編輯題解</button> : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button aria-label={`上移 #${item.id}`} className={actionButtonClass} disabled={isSaving || index === 0} onClick={() => moveItem(index, -1)} type="button"><ChevronUp aria-hidden="true" className="h-4 w-4" /></button>
                    <button aria-label={`下移 #${item.id}`} className={actionButtonClass} disabled={isSaving || index === plan.items.length - 1} onClick={() => moveItem(index, 1)} type="button"><ChevronDown aria-hidden="true" className="h-4 w-4" /></button>
                    <button aria-label={`移除 #${item.id}`} className={actionButtonClass} disabled={isSaving || plan.items.length === 1} onClick={() => removeItem(index)} type="button"><Trash2 aria-hidden="true" className="h-4 w-4" /></button>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <form className="mt-5 grid gap-3 border-t border-[#26344d] pt-5 md:grid-cols-[8rem_minmax(0,1fr)_9rem_auto]" onSubmit={addItem}>
            <label className="grid gap-1 text-xs text-slate-400">題號<input className="rounded border border-[#30445f] bg-[#080f1c] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" inputMode="numeric" min="1" onChange={(event) => setNewId(event.target.value)} required type="number" value={newId} /></label>
            <label className="grid gap-1 text-xs text-slate-400">題名<input className="rounded border border-[#30445f] bg-[#080f1c] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" maxLength={180} onChange={(event) => setNewTitle(event.target.value)} required type="text" value={newTitle} /></label>
            <label className="grid gap-1 text-xs text-slate-400">輪次<input className="rounded border border-[#30445f] bg-[#080f1c] px-3 py-2 text-sm text-slate-100 outline-none focus:border-cyan-300" maxLength={80} onChange={(event) => setNewRound(event.target.value)} required type="text" value={newRound} /></label>
            <button className={`${actionButtonClass} self-end`} disabled={isSaving} type="submit"><Plus aria-hidden="true" className="h-4 w-4" />加入順序</button>
          </form>
        </div>
      ) : null}
    </PixelCard>
  );
}
