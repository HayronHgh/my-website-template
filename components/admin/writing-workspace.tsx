"use client";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { WritingDiff } from "@/components/admin/writing-diff";
import type {
  AdminArticle,
  AdminArticleListItem,
  AdminSession,
} from "@/types/admin";
import type {
  WorkingCopy,
  WorkingCopyListItem,
  WritingDomain,
} from "@/lib/admin/working-copies";
import { getMarkdownOutline } from "@/lib/content/outline";
import { MarkdownCopyButtons } from "@/components/blog/markdown-copy-buttons";
import { problemTemplate } from "@/lib/leetcode/schema";
import { LeetCodeNotebookSidebar } from "@/components/admin/leetcode-notebook-sidebar";

const DocumentComposer = dynamic(
  () =>
    import("@/components/admin/document-composer").then(
      (m) => m.DocumentComposer,
    ),
  { ssr: false, loading: () => <p>載入文件編輯器…</p> },
);
type Props = {
  domain: WritingDomain;
  initialSlug?: string;
  initialSession: AdminSession;
};
async function api<T>(url: string, method = "GET", data?: unknown): Promise<T> {
  const response = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : undefined,
    body: data ? JSON.stringify(data) : undefined,
    cache: "no-store",
  });
  const body = await response.json();
  if (!response.ok || !body.ok)
    throw new Error(
      `${response.status === 409 ? "版本衝突：" : ""}${body.error?.message ?? "連線失敗"}`,
    );
  return body.data;
}
function snapshot(copy: WorkingCopy) {
  return JSON.stringify({ fields: copy.fields, slug: copy.slug });
}

export function WritingWorkspace({
  domain,
  initialSlug,
  initialSession,
}: Props) {
  const router = useRouter();
  const [copy, setCopy] = useState<WorkingCopy | null>(null);
  const [copies, setCopies] = useState<WorkingCopyListItem[]>([]);
  const [articles, setArticles] = useState<AdminArticleListItem[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("選擇文章或建立工作稿");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [composing, setComposing] = useState(false);
  const [preview, setPreview] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [review, setReview] = useState(false);
  const [base, setBase] = useState<AdminArticle | null>(null);
  const [focus, setFocus] = useState(false);
  const [side, setSide] = useState("outline");
  const [recovery, setRecovery] = useState<WorkingCopy | null>(null);
  const [compareCurrent, setCompareCurrent] = useState(false);
  const latest = useRef(copy);
  const saved = useRef("");
  const [savedSnapshot, setSavedSnapshot] = useState("");
  const inFlight = useRef<Promise<WorkingCopy> | null>(null);
  const epoch = useRef(0);
  const initialized = useRef(false);
  const saveCallback = useRef<() => Promise<WorkingCopy | null>>(
    async () => null,
  );
  const apiRoot =
    domain === "articles" ? "/api/admin/posts" : `/api/admin/${domain}`;
  const storageKey = (id: string) =>
    `writing:${initialSession.user.username}:${id}`;
  const dirty = !!copy && snapshot(copy) !== savedSnapshot;
  const refresh = useCallback(async () => {
    const [a, c] = await Promise.all([
      api<{ posts: AdminArticleListItem[] }>(apiRoot),
      api<{ copies: WorkingCopyListItem[] }>(
        `/api/admin/working-copies?domain=${domain}`,
      ),
    ]);
    setArticles(a.posts);
    setCopies(c.copies);
  }, [apiRoot, domain]);
  function edit(change: Partial<WorkingCopy>) {
    setCopy((previous) => {
      if (!previous) return previous;
      const next = { ...previous, ...change };
      latest.current = next;
      return next;
    });
    setMessage("未儲存");
    setError("");
    setReview(false);
  }
  function field<K extends keyof WorkingCopy["fields"]>(
    key: K,
    value: WorkingCopy["fields"][K],
  ) {
    if (latest.current)
      edit({ fields: { ...latest.current.fields, [key]: value } });
  }
  async function save(): Promise<WorkingCopy | null> {
    if (inFlight.current) await inFlight.current;
    const next = latest.current;
    if (!next || snapshot(next) === saved.current) return next;
    if (!navigator.onLine) {
      setMessage("離線 · 已保留本機復原副本");
      return null;
    }
    const submitted = snapshot(next);
    const generation = epoch.current;
    setMessage("儲存工作稿中…");
    const job = api<{ copy: WorkingCopy }>(
      `/api/admin/working-copies/${next.id}`,
      "PUT",
      { revision: next.revision, slug: next.slug, fields: next.fields },
    ).then((result) => result.copy);
    inFlight.current = job;
    try {
      const result = await job;
      if (epoch.current !== generation) return result;
      const current = latest.current;
      if (current?.id === result.id) {
        const merged = {
          ...result,
          ...(snapshot(current) !== submitted
            ? { fields: current.fields, slug: current.slug }
            : {}),
        };
        latest.current = merged;
        setCopy(merged);
        setCopies((previous) =>
          previous.map((c) => (c.id === result.id ? result : c)),
        );
        saved.current = snapshot(result);
        setSavedSnapshot(saved.current);
        try {
          if (snapshot(merged) === saved.current)
            localStorage.removeItem(storageKey(result.id));
          else
            localStorage.setItem(storageKey(result.id), JSON.stringify(merged));
        } catch {}
        setMessage(
          snapshot(merged) === saved.current
            ? `已儲存工作稿 · ${new Date(result.updatedAt).toLocaleTimeString()}`
            : "未儲存 · 繼續儲存最新內容",
        );
      }
      return result;
    } catch (e) {
      setError((e as Error).message);
      setMessage("儲存失敗 · 本機內容仍保留");
      throw e;
    } finally {
      if (inFlight.current === job) inFlight.current = null;
    }
  }
  useEffect(() => {
    saveCallback.current = save;
  });
  async function choose(slug?: string, id?: string) {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const current = latest.current;
      if (current && snapshot(current) !== saved.current) {
        const stored = await save();
        if (!stored) throw Error("目前離線，請先儲存再切換文章。");
      }
      const result = id
        ? await api<{ copy: WorkingCopy }>(`/api/admin/working-copies/${id}`)
        : await api<{ copy: WorkingCopy }>(
            "/api/admin/working-copies",
            "POST",
            { domain, ...(slug ? { slug } : {}) },
          );
      epoch.current++;
      const next = result.copy;
      latest.current = next;
      saved.current = snapshot(next);
      setSavedSnapshot(saved.current);
      setCopy(next);
      setPreview("");
      setPreviewMode(false);
      setReview(false);
      setMessage("已載入工作稿，尚未發布的變更不會影響正式文章");
      setBase(null);
      setRecovery(null);
      const url = new URL(location.href);
      url.searchParams.set("draft", next.id);
      if (next.slug) url.searchParams.set("slug", next.slug);
      else url.searchParams.delete("slug");
      router.replace(url.pathname + url.search, { scroll: false });
      if (next.baseRevision && next.slug) {
        const original = await api<{ article: AdminArticle }>(
          `${apiRoot}/${next.slug.split("/").map(encodeURIComponent).join("/")}`,
        );
        setBase(original.article);
      }
      try {
        const local = JSON.parse(
          localStorage.getItem(storageKey(next.id)) ?? "null",
        ) as WorkingCopy | null;
        if (local && local.id === next.id && snapshot(local) !== snapshot(next))
          setRecovery(local);
      } catch {}
      if (!next.baseRevision && !next.fields.content && domain === "leetcode")
        field("content", problemTemplate);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    void refresh().catch((e) => setError(e.message));
    const id = new URL(location.href).searchParams.get("draft");
    if (id || initialSlug)
      queueMicrotask(() => {
        void choose(initialSlug, id ?? undefined);
      });
    // The initial URL is consumed once; subsequent switches remain controlled.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (!copy || !dirty) return;
    try {
      localStorage.setItem(storageKey(copy.id), JSON.stringify(copy));
    } catch {
      queueMicrotask(() =>
        setError("瀏覽器無法儲存復原副本，請保持連線並確認伺服器儲存成功。"),
      );
    }
    if (busy || composing || review) return;
    const timer = setTimeout(() => {
      void saveCallback.current().catch(() => {});
    }, 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copy, dirty, busy, composing, review]);
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (latest.current && snapshot(latest.current) !== saved.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const key = (e: KeyboardEvent) => {
      if (e.isComposing) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveCallback.current().catch(() => {});
      }
    };
    const online = () => {
      void saveCallback.current().catch(() => {});
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("keydown", key);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("keydown", key);
      window.removeEventListener("online", online);
    };
  }, []);
  async function makePreview() {
    if (!latest.current) return;
    const endpoint =
      domain === "articles"
        ? "/api/admin/preview"
        : `/api/admin/${domain}-preview`;
    const result = await api<{ html: string }>(endpoint, "POST", {
      content: latest.current.fields.content.replace(
        /assets\/(workspace-[a-f0-9-]+\.(?:png|jpg|webp|gif|avif|mp4))/g,
        (all, name: string) =>
          name.startsWith(`workspace-${latest.current!.id}-`)
            ? `/api/admin/working-copies/${latest.current!.id}/assets/${name}`
            : all,
      ),
      slug: latest.current.slug || "working-copy",
    });
    setPreview(result.html);
    setPreviewMode(true);
  }
  async function preparePublish() {
    setBusy(true);
    setError("");
    try {
      const result = await save();
      if (!result) throw Error("請先連線並儲存工作稿。");
      if (result.slug && result.baseRevision) {
        const current = await api<{ article: AdminArticle }>(
          `${apiRoot}/${result.slug.split("/").map(encodeURIComponent).join("/")}`,
        );
        setBase(current.article);
        if (current.article.revision !== result.baseRevision) {
          setCompareCurrent(true);
          throw Error(
            "正式文章已被其他裝置或 SSH 更新。請比較內容並手動合併；不會覆蓋正式版本。",
          );
        }
      }
      await makePreview();
      setReview(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function publish() {
    if (!copy || dirty) return;
    setBusy(true);
    try {
      const result = await api<{ copy: WorkingCopy }>(
        `/api/admin/working-copies/${copy.id}/publish`,
        "POST",
        { revision: copy.revision },
      );
      latest.current = result.copy;
      saved.current = snapshot(result.copy);
      setSavedSnapshot(saved.current);
      setCopy(result.copy);
      setReview(false);
      setMessage("發布成功 · 已建立正式歷史版本");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const outlineSource = useDeferredValue(copy?.fields.content ?? "");
  const outline = useMemo(
    () => getMarkdownOutline(outlineSource),
    [outlineSource],
  );
  return (
    <div className={`writing-workspace ${focus ? "writing-focus" : ""}`}>
      <header className="writing-top">
        <strong>
          Writing Studio <small>{domain}</small>
        </strong>
        <div>
          <span role="status" aria-live="polite">
            {message}
          </span>
          <button type="button" onClick={() => setFocus(!focus)}>
            {focus ? "離開專注" : "專注寫作"}
          </button>
          <a href={`/admin/${domain}?legacy=1`}>舊版管理</a>
        </div>
      </header>
      {error && (
        <p role="alert" className="writing-error">
          {error}
        </p>
      )}
      {recovery && (
        <div className="writing-recovery">
          發現尚未同步的本機內容。
          <button
            type="button"
            onClick={() => {
              edit({ fields: recovery.fields, slug: recovery.slug });
              setRecovery(null);
            }}
          >
            恢復到工作稿
          </button>
          <button type="button" onClick={() => setRecovery(null)}>
            保留伺服器版本
          </button>
        </div>
      )}
      <div className="writing-layout">
        <aside className="writing-list">
          {domain === "leetcode" && (
            <details>
              <summary>刷題順序與題本</summary>
              <LeetCodeNotebookSidebar
                posts={articles}
                selectedSlug={copy?.slug ?? null}
                disabled={busy}
                loading={busy}
                error=""
                onOpen={(slug) => void choose(slug)}
                onChoose={async (problem) => {
                  try {
                    const result = await api<{ article: AdminArticle }>(
                      "/api/admin/leetcode",
                      "POST",
                      { intent: "open-notebook", ...problem },
                    );
                    await choose(result.article.slug);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
                onCollapse={() => setFocus(true)}
                onReload={() =>
                  void refresh().catch((e) => setError(e.message))
                }
              />
            </details>
          )}
          <button type="button" disabled={busy} onClick={() => choose()}>
            ＋ 新工作稿
          </button>
          <input
            aria-label="搜尋文章"
            value={query}
            placeholder="搜尋文章或工作稿"
            onChange={(e) => setQuery(e.target.value)}
          />
          <h2>工作稿</h2>
          {copies
            .filter((c) =>
              (c.fields.title + c.slug)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((c) => (
              <button
                type="button"
                aria-current={copy?.id === c.id ? "page" : undefined}
                key={c.id}
                onClick={() => choose(undefined, c.id)}
              >
                {c.fields.title || "未命名工作稿"}
                <small>
                  {c.fields.published ? "已發布 · 有獨立工作稿" : "未發布"}
                </small>
              </button>
            ))}
          <h2>正式內容</h2>
          {articles
            .filter((a) =>
              (a.title + a.slug).toLowerCase().includes(query.toLowerCase()),
            )
            .map((a) => (
              <button type="button" key={a.slug} onClick={() => choose(a.slug)}>
                {a.title}
                <small>{a.published ? "公開" : "草稿"}</small>
              </button>
            ))}
        </aside>
        <section className="writing-document">
          {copy ? (
            <>
              <div className="writing-actions">
                <label className="writing-upload">
                  加入圖片／影片
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif,image/avif,video/mp4"
                    disabled={busy || review}
                    onChange={async (e) => {
                      const asset = e.target.files?.[0];
                      e.target.value = "";
                      if (!asset) return;
                      try {
                        const form = new FormData();
                        form.set("file", asset);
                        const response = await fetch(
                          `/api/admin/working-copies/${copy.id}/assets`,
                          { method: "POST", body: form },
                        );
                        const body = await response.json();
                        if (!response.ok)
                          throw Error(body.error?.message ?? "上傳失敗");
                        const snippet =
                          asset.type === "video/mp4"
                            ? body.data.assetPath
                            : `![圖片說明](${body.data.assetPath})`;
                        field(
                          "content",
                          `${latest.current?.fields.content ?? ""}\n\n${snippet}\n`,
                        );
                        setMessage("媒體已加入工作稿，發布前不會公開");
                      } catch (e) {
                        setError((e as Error).message);
                      }
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void save().catch(() => {})}
                >
                  儲存工作稿
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (previewMode) {
                      setPreviewMode(false);
                      setReview(false);
                    } else void makePreview().catch((e) => setError(e.message));
                  }}
                >
                  {previewMode ? "繼續編輯" : "閱讀預覽"}
                </button>
                <button
                  type="button"
                  disabled={busy || initialSession.user.role !== "admin"}
                  onClick={preparePublish}
                >
                  {copy.fields.published ? "更新發布" : "發布文章"}
                </button>
              </div>
              <input
                className="writing-title"
                aria-label="文章標題"
                placeholder="文章標題"
                value={copy.fields.title}
                disabled={busy || review}
                onChange={(e) => field("title", e.target.value)}
              />
              {review && (
                <section className="writing-review">
                  <h2>確認更新發布</h2>
                  <p>
                    左側為目前正式內容，右側為即將發布的工作稿。請同時確認標題、摘要及文章設定。
                  </p>
                  <WritingDiff
                    before={
                      base
                        ? JSON.stringify(
                            {
                              title: base.title,
                              date: base.date,
                              description: base.description,
                              tags: base.tags,
                              problem: base.problem,
                              research: base.research,
                            },
                            null,
                            2,
                          ) +
                          "\n\n" +
                          base.content
                        : "尚未發布"
                    }
                    after={
                      JSON.stringify(
                        {
                          title: copy.fields.title,
                          date: copy.fields.date,
                          description: copy.fields.description,
                          tags: copy.fields.tags,
                          problem: copy.fields.problem,
                          research: copy.fields.research,
                        },
                        null,
                        2,
                      ) +
                      "\n\n" +
                      copy.fields.content
                    }
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setReview(false);
                      setPreviewMode(false);
                    }}
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    disabled={busy || dirty}
                    onClick={publish}
                  >
                    確認發布
                  </button>
                </section>
              )}
              {compareCurrent && base && (
                <section className="writing-review">
                  <h2>版本衝突比較</h2>
                  <div className="writing-diff">
                    <pre>{base.content}</pre>
                    <pre>{copy.fields.content}</pre>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const blob = new Blob([copy.fields.content], {
                        type: "text/markdown",
                      });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "working-copy.md";
                      a.click();
                      URL.revokeObjectURL(a.href);
                    }}
                  >
                    匯出工作稿
                  </button>
                  <p>
                    先保留工作稿，捨棄後重新開啟最新正式版本，再貼入合併內容。
                  </p>
                </section>
              )}
              {previewMode ? (
                <div
                  className="prose-content writing-preview"
                  dangerouslySetInnerHTML={{ __html: preview }}
                />
              ) : (
                <DocumentComposer
                  domain={domain}
                  slug={copy.slug}
                  draftId={copy.id}
                  key={copy.id}
                  value={copy.fields.content}
                  onChange={(v) => field("content", v)}
                  disabled={busy || review}
                  onComposingChange={setComposing}
                />
              )}
              <details className="writing-settings" open={side === "settings"}>
                <summary
                  onClick={(event) => {
                    event.preventDefault();
                    setSide(side === "settings" ? "outline" : "settings");
                  }}
                >
                  文章設定
                </summary>
                <label>
                  網址 slug
                  <input
                    value={copy.slug}
                    readOnly={!!copy.baseRevision}
                    onChange={(e) => edit({ slug: e.target.value })}
                  />
                </label>
                <label>
                  日期
                  <input
                    type="date"
                    value={copy.fields.date}
                    onChange={(e) => field("date", e.target.value)}
                  />
                </label>
                <label>
                  摘要
                  <textarea
                    value={copy.fields.description}
                    onChange={(e) => field("description", e.target.value)}
                  />
                </label>
                <label>
                  標籤（逗號分隔）
                  <input
                    value={copy.fields.tags.join(", ")}
                    onChange={(e) =>
                      field(
                        "tags",
                        e.target.value.split(",").map((s) => s.trim()),
                      )
                    }
                  />
                </label>
                {copy.fields.research && (
                  <>
                    <label>
                      研究領域
                      <input
                        value={copy.fields.research.area}
                        onChange={(e) =>
                          field("research", {
                            ...copy.fields.research!,
                            area: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label>
                      排序
                      <input
                        type="number"
                        value={copy.fields.research.rank}
                        onChange={(e) =>
                          field("research", {
                            ...copy.fields.research!,
                            rank: Number(e.target.value),
                          })
                        }
                      />
                    </label>
                    <label>
                      階段
                      <select
                        value={copy.fields.research.stage}
                        onChange={(e) =>
                          field("research", {
                            ...copy.fields.research!,
                            stage: e.target.value as NonNullable<
                              WorkingCopy["fields"]["research"]
                            >["stage"],
                          })
                        }
                      >
                        {[
                          "exploring",
                          "implementing",
                          "evaluating",
                          "published",
                        ].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </label>
                  </>
                )}
                {copy.fields.problem && (
                  <label>
                    題本類型
                    <select
                      value={copy.fields.problem.entryType ?? "problem"}
                      onChange={(e) => {
                        const entryType = e.target.value as
                          "problem" | "note" | "template";
                        field(
                          "problem",
                          entryType === "problem"
                            ? {
                                id: 1,
                                difficulty: "Easy",
                                status: "Todo",
                                language: "TypeScript",
                                entryType,
                              }
                            : {
                                id: null,
                                difficulty: null,
                                status: null,
                                language: null,
                                entryType,
                              },
                        );
                      }}
                    >
                      <option value="problem">題解</option>
                      <option value="note">學習筆記</option>
                      <option value="template">模板（不公開）</option>
                    </select>
                  </label>
                )}
                {copy.fields.problem &&
                  (!copy.fields.problem.entryType ||
                    copy.fields.problem.entryType === "problem") && (
                    <>
                      <label>
                        題號
                        <input
                          type="number"
                          min="1"
                          value={copy.fields.problem.id ?? ""}
                          onChange={(e) =>
                            field("problem", {
                              ...copy.fields.problem!,
                              id: Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label>
                        語言
                        <input
                          value={copy.fields.problem.language ?? ""}
                          onChange={(e) =>
                            field("problem", {
                              ...copy.fields.problem!,
                              language: e.target.value,
                            })
                          }
                        />
                      </label>
                      <label>
                        難度
                        <select
                          value={copy.fields.problem.difficulty ?? "Easy"}
                          onChange={(e) =>
                            field("problem", {
                              ...copy.fields.problem!,
                              difficulty: e.target.value as
                                "Easy" | "Medium" | "Hard",
                            })
                          }
                        >
                          {["Easy", "Medium", "Hard"].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </label>
                    </>
                  )}
                <button
                  type="button"
                  onClick={async () => {
                    if (
                      !confirm(
                        "捨棄這份工作稿？正式文章不變，伺服器會保留封存副本。",
                      )
                    )
                      return;
                    try {
                      await api(
                        `/api/admin/working-copies/${copy.id}`,
                        "DELETE",
                        { revision: copy.revision },
                      );
                      localStorage.removeItem(storageKey(copy.id));
                      epoch.current++;
                      latest.current = null;
                      setCopy(null);
                      setCompareCurrent(false);
                      await refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  }}
                >
                  捨棄工作稿
                </button>
              </details>
            </>
          ) : (
            <p className="writing-empty">
              選擇文章開始修改，或建立新的工作稿。
              <br />
              工作稿會自動儲存；按下發布並確認後，讀者才會看到變更。
            </p>
          )}
        </section>
        <aside className="writing-outline">
          <h2>文章大綱</h2>
          {outline.map((h) => (
            <button
              type="button"
              key={h.id}
              onClick={() => {
                const target = [
                  ...document.querySelectorAll<HTMLElement>(
                    ".document-prose :is(h1,h2,h3), .writing-preview :is(h1,h2,h3)",
                  ),
                ].find((e) => e.textContent === h.title);
                target?.scrollIntoView({ block: "center" });
              }}
            >
              {h.title}
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              setSide(side === "settings" ? "outline" : "settings")
            }
          >
            文章設定
          </button>
          <small>
            Ctrl/⌘+S 儲存工作稿
            <br />
            Ctrl/⌘+Shift+P 插入選單
          </small>
        </aside>
      </div>
      <MarkdownCopyButtons />
    </div>
  );
}
