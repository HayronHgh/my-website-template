"use client";

import {
  Activity,
  Archive,
  ChevronDown,
  ChevronRight,
  Copy,
  Eye,
  FilePlus2,
  Flame,
  Folder,
  FolderPlus,
  ListFilter,
  LoaderCircle,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  PencilLine,
  Redo2,
  RotateCcw,
  Save,
  Search,
  ShieldCheck,
  Undo2,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import { InlineMarkdownEditor } from "@/components/admin/inline-markdown-editor";
import { MarkdownCopyButtons } from "@/components/blog/markdown-copy-buttons";
import { NeonButton } from "@/components/ui/neon-button";
import { PixelCard } from "@/components/ui/pixel-card";
import { adminRequest, AdminClientError } from "@/components/admin/admin-api";
import { getAdminArticleApiPath as articleApiPath } from "@/lib/admin/article-url";
import { problemTemplate, type ProblemMetadata } from "@/lib/leetcode/schema";
import type { ResearchMetadata } from "@/lib/research/schema";
import {
  getAdminArticleGroupKey,
  getAdminArticleLeafSlug,
  groupAdminArticles,
  ROOT_ARTICLE_GROUP_KEY,
} from "@/lib/admin/article-tree";
import {
  MAXIMUM_EXISTING_BLOG_SLUG_LENGTH,
  parseSafeExistingBlogSlug,
} from "@/lib/blog/slug";
import { serializeFrontmatter } from "@/lib/content/frontmatter";
import { formatAdminUpdatedAt } from "@/lib/admin/date";
import {
  canRedoMarkdown,
  canUndoMarkdown,
  createMarkdownHistory,
  recordMarkdownEdit,
  redoMarkdownHistory,
  resetMarkdownHistory,
  undoMarkdownHistory,
  type MarkdownHistory,
} from "@/lib/admin/editor-history";
import {
  AUTO_SAVE_DELAY_MS,
  getRevisionSyncAction,
  HEARTBEAT_INTERVAL_MS,
  mergeCommittedArticleIdentity,
  shouldAutosave,
} from "@/lib/admin/live-sync";
import { formatAdminTagInput, parseAdminTagInput } from "@/lib/admin/tag-input";
import type {
  AdminArticle,
  AdminArticleListItem,
  AdminArticleStatus,
  AdminSaveMode,
  AdminSession,
} from "@/types/admin";

type AdminConsoleProps = {
  initialSlug?: string;
  domain?: "articles" | "leetcode" | "research";
  initialSession: AdminSession;
};

type ArticleForm = {
  problem?: ProblemMetadata;
  research?: ResearchMetadata;
  content: string;
  date: string;
  description: string;
  published: boolean;
  slug: string;
  tags: string;
  title: string;
};

type PendingAction = "archive" | "publish" | "unpublish" | null;
type HeartbeatStatus =
  | "checking"
  | "error"
  | "idle"
  | "live"
  | "offline"
  | "paused"
  | "remote-change";
type WorkspaceTab = "editor" | "preview";

const disabledButtonClass =
  "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45";

const heartbeatLabels: Record<HeartbeatStatus, string> = {
  checking: "SYNC CHECK",
  error: "SYNC RETRY / 1S",
  idle: "SYNC WAITING / 1S",
  live: "LIVE SYNC / 1S",
  offline: "OFFLINE",
  paused: "SYNC PAUSED",
  "remote-change": "REMOTE CHANGE",
};

function getToday() {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Taipei",
    year: "numeric",
  }).format(new Date());
}

function createNewArticleForm(domain: "articles" | "leetcode" | "research" = "articles"): ArticleForm {
  return {
    ...(domain === "leetcode" ? { problem: { id: 1, difficulty: "Easy" as const, status: "Todo" as const, language: "TypeScript" } } : {}),
    ...(domain === "research" ? { research: { area: "Machine Learning", rank: 10, stage: "exploring" as const } } : {}),
    content: domain === "leetcode" ? problemTemplate : domain === "research" ? [
      "## Research question",
      "",
      "清楚描述假設、問題邊界與評估條件。",
      "",
      "## Method",
      "",
      "記錄資料、模型、實驗流程與可重現設定。",
      "",
      "## Findings",
      "",
      "整理目前證據、限制與下一步。",
    ].join("\n") : [
      "## 背景",
      "",
      "說明這篇文章要解決的問題與讀者會得到什麼。",
      "",
      "## 實作",
      "",
      "記錄關鍵決策、驗證方式與取捨。",
    ].join("\n"),
    date: getToday(),
    description: "",
    published: false,
    slug: "",
    tags: "",
    title: "",
  };
}

function articleToForm(article: AdminArticle): ArticleForm {
  return {
    ...(article.problem ? { problem: article.problem } : {}),
    ...(article.research ? { research: article.research } : {}),
    content: article.content.replace(/^\n/, "").replace(/\n$/, ""),
    date: article.date,
    description: article.description,
    published: article.published,
    slug: article.slug,
    tags: formatAdminTagInput(article.tags),
    title: article.title,
  };
}

function articleToListItem(article: AdminArticle): AdminArticleListItem {
  return {
    ...(article.problem ? { problem: article.problem } : {}),
    ...(article.research ? { research: article.research } : {}),
    date: article.date,
    description: article.description,
    pathSegments: article.pathSegments,
    published: article.published,
    revision: article.revision,
    slug: article.slug,
    tags: article.tags,
    title: article.title,
    updatedAt: article.updatedAt,
  };
}

function serializeForm(form: ArticleForm) {
  return JSON.stringify(form);
}

function serializePreviewInput(form: ArticleForm) {
  return JSON.stringify({ content: form.content, slug: form.slug });
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof AdminClientError ? error.message : fallback;
}

export function AdminConsole({ initialSession, domain = "articles", initialSlug }: AdminConsoleProps) {
  const apiRoot = domain === "leetcode"
    ? "/api/admin/leetcode"
    : domain === "research"
      ? "/api/admin/research"
      : "/api/admin/posts";
  const getAdminArticleApiPath = useCallback((slug: string) => articleApiPath(slug).replace("/api/admin/posts", apiRoot), [apiRoot]);
  const publicLabel = domain === "leetcode" ? "LeetCode" : domain === "research" ? "Research" : "Articles";
  const [posts, setPosts] = useState<AdminArticleListItem[]>([]);
  const openedInitialSlug = useRef(false);
  useEffect(() => {
    if (initialSlug && !openedInitialSlug.current) {
      openedInitialSlug.current = true;
      void loadArticle(initialSlug);
    }
    // The initial URL selection is consumed once; subsequent selection is local.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSlug]);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [status, setStatus] = useState<AdminArticleStatus>("all");
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [revision, setRevision] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleForm>(() => createNewArticleForm(domain));
  const [baseline, setBaseline] = useState(() => serializeForm(createNewArticleForm(domain)));
  const [markdownHistory, setMarkdownHistory] = useState(() =>
    createMarkdownHistory(form.content),
  );
  const [previewHtml, setPreviewHtml] = useState("");
  const [workspaceTab, setWorkspaceTab] = useState<WorkspaceTab>("editor");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [collapsedArticleGroups, setCollapsedArticleGroups] = useState<Set<string>>(
    () => new Set(),
  );
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isListLoading, setIsListLoading] = useState(true);
  const [isArticleLoading, setIsArticleLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [listError, setListError] = useState("");
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [heartbeatStatus, setHeartbeatStatus] = useState<HeartbeatStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [lastHeartbeatAt, setLastHeartbeatAt] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isPageVisible, setIsPageVisible] = useState(true);
  const [isMarkdownComposing, setIsMarkdownComposing] = useState(false);
  const [autoSaveRetryEpoch, setAutoSaveRetryEpoch] = useState(0);
  const [conflict, setConflict] = useState<{
    currentRevision?: string;
    currentUpdatedAt?: string;
  } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const markdownHistoryRef = useRef<MarkdownHistory>(markdownHistory);
  const markdownCompositionRef = useRef(false);
  const articleRequestSequence = useRef(0);
  const listRequestSequence = useRef(0);
  const previewRequestSequence = useRef(0);
  const lastPreviewSnapshotRef = useRef<string | null>(null);
  const conflictAlertRef = useRef<HTMLDivElement>(null);
  const lifecycleTriggerRef = useRef<HTMLElement | null>(null);
  const consoleHeadingRef = useRef<HTMLHeadingElement>(null);
  const historyGuardActiveRef = useRef(false);
  const historyGuardTransitionRef = useRef(false);
  const skipBeforeUnloadRef = useRef(false);
  const latestFormRef = useRef(form);
  const baselineRef = useRef(baseline);
  const selectedSlugRef = useRef(selectedSlug);
  const revisionRef = useRef(revision);
  const listFilterRef = useRef({ query: deferredQuery, status });
  const isDirtyRef = useRef(false);
  const conflictRef = useRef(conflict);
  const saveInFlightRef = useRef(false);
  const syncGenerationRef = useRef(0);
  const editorEpochRef = useRef(0);
  const failedAutoSaveSnapshotRef = useRef<string | null>(null);
  const retryAutoSaveOnReconnectRef = useRef(false);
  const connectivityRef = useRef({ isOnline: true, isPageVisible: true });

  const isDirty = useMemo(() => serializeForm(form) !== baseline, [baseline, form]);
  const parsedTags = useMemo(
    () => parseAdminTagInput(form.tags),
    [form.tags],
  );
  const tagsAreInvalid = parsedTags.length > 20 || parsedTags.some((tag) => tag.length > 40);
  const isAdmin = initialSession.user.role === "admin";
  const isPublishedEditor = !isAdmin && form.published;
  const hasSelection = selectedSlug !== null;
  const isMutationInFlight = isSaving || isAutoSaving;
  const slugIsSafe = parseSafeExistingBlogSlug(form.slug) !== null;
  const articleGroups = useMemo(() => groupAdminArticles(posts), [posts]);

  useEffect(() => {
    latestFormRef.current = form;
    baselineRef.current = baseline;
    selectedSlugRef.current = selectedSlug;
    revisionRef.current = revision;
    listFilterRef.current = { query: deferredQuery, status };
    isDirtyRef.current = isDirty;
    conflictRef.current = conflict;
  }, [baseline, conflict, deferredQuery, form, isDirty, revision, selectedSlug, status]);

  useEffect(() => {
    const updateConnectivity = () => {
      const nextIsOnline = window.navigator.onLine;
      const nextIsPageVisible = document.visibilityState === "visible";

      if (
        !connectivityRef.current.isOnline &&
        nextIsOnline &&
        retryAutoSaveOnReconnectRef.current
      ) {
        failedAutoSaveSnapshotRef.current = null;
        retryAutoSaveOnReconnectRef.current = false;
        setAutoSaveRetryEpoch((current) => current + 1);
      }

      connectivityRef.current = {
        isOnline: nextIsOnline,
        isPageVisible: nextIsPageVisible,
      };
      setIsOnline(nextIsOnline);
      setIsPageVisible(nextIsPageVisible);
    };

    updateConnectivity();
    window.addEventListener("online", updateConnectivity);
    window.addEventListener("offline", updateConnectivity);
    document.addEventListener("visibilitychange", updateConnectivity);

    return () => {
      window.removeEventListener("online", updateConnectivity);
      window.removeEventListener("offline", updateConnectivity);
      document.removeEventListener("visibilitychange", updateConnectivity);
    };
  }, []);

  function handleRequestError(requestError: unknown, fallback: string) {
    if (requestError instanceof AdminClientError && requestError.status === 401) {
      window.location.assign("/admin/login?reason=session-expired");
      return;
    }

    setError(getErrorMessage(requestError, fallback));
  }

  async function refreshPosts({ silent = false }: { silent?: boolean } = {}) {
    const requestSequence = ++listRequestSequence.current;
    if (!silent) {
      setIsListLoading(true);
      setListError("");
    }

    try {
      const currentFilter = listFilterRef.current;
      const params = new URLSearchParams({
        q: currentFilter.query,
        status: currentFilter.status,
      });
      const result = await adminRequest<{ posts: AdminArticleListItem[] }>(
        `${apiRoot}?${params}`,
      );
      if (requestSequence === listRequestSequence.current) {
        setPosts(result.posts);
        setListError("");
      }
      return result.posts;
    } catch (requestError) {
      if (requestSequence === listRequestSequence.current) {
        if (!silent) {
          setListError(getErrorMessage(requestError, "無法載入文章清單。"));
        }
        if (requestError instanceof AdminClientError && requestError.status === 401) {
          handleRequestError(requestError, "無法載入文章清單。");
        }
      }
      return null;
    } finally {
      if (requestSequence === listRequestSequence.current) {
        setIsListLoading(false);
      }
    }
  }

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshPosts();
    }, 180);

    return () => window.clearTimeout(timeout);
    // refreshPosts deliberately follows the deferred query and status only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deferredQuery, status]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (isDirty && !skipBeforeUnloadRef.current) {
        event.preventDefault();
        event.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const handlePopState = () => {
      if (historyGuardTransitionRef.current) {
        historyGuardTransitionRef.current = false;
        return;
      }

      if (!historyGuardActiveRef.current || skipBeforeUnloadRef.current) {
        return;
      }

      if (window.confirm("目前有尚未儲存的變更，確定要離開後台並回到首頁嗎？")) {
        historyGuardActiveRef.current = false;
        skipBeforeUnloadRef.current = true;
        window.location.assign("/");
        return;
      }

      historyGuardTransitionRef.current = true;
      window.history.forward();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (isDirty && !historyGuardActiveRef.current) {
      window.history.pushState(
        { ...window.history.state, hayronAdminDirtyGuard: true },
        "",
        window.location.href,
      );
      historyGuardActiveRef.current = true;
      return;
    }

    if (!isDirty && historyGuardActiveRef.current) {
      historyGuardActiveRef.current = false;
      historyGuardTransitionRef.current = true;
      window.history.back();
    }
  }, [isDirty]);

  useEffect(() => {
    if (conflict) {
      conflictAlertRef.current?.focus();
    }
  }, [conflict]);

  useEffect(() => {
    if (!pendingAction && !isMutationInFlight && lifecycleTriggerRef.current) {
      const trigger = lifecycleTriggerRef.current;
      lifecycleTriggerRef.current = null;

      if (trigger.isConnected && !trigger.hasAttribute("disabled")) {
        trigger.focus();
      } else {
        consoleHeadingRef.current?.focus();
      }
    }
  }, [isMutationInFlight, pendingAction]);

  async function requestPreview(
    nextForm = form,
    { automatic = false }: { automatic?: boolean } = {},
  ) {
    if (
      isPreviewLoading ||
      isArticleLoading ||
      isSaving ||
      (!automatic && isAutoSaving) ||
      (automatic && markdownCompositionRef.current)
    ) {
      return;
    }

    if (!nextForm.slug || !nextForm.content.trim()) {
      if (automatic) {
        return;
      }
      setError("請先輸入 slug，才能解析文章內的相對資源。");
      return;
    }

    const requestSequence = ++previewRequestSequence.current;
    lastPreviewSnapshotRef.current = serializePreviewInput(nextForm);
    setIsPreviewLoading(true);
    if (!automatic) {
      setError("");
    }

    try {
      const previewUrl = domain === "leetcode"
        ? "/api/admin/leetcode-preview"
        : domain === "research"
          ? "/api/admin/research-preview"
          : "/api/admin/preview";
      const result = await adminRequest<{ html: string }>(previewUrl, {
        body: JSON.stringify({ content: nextForm.content, slug: nextForm.slug }),
        method: "POST",
      });
      if (requestSequence === previewRequestSequence.current) {
        setPreviewHtml(result.html);
        if (!automatic) {
          setWorkspaceTab("preview");
          setMessage("安全預覽已更新。");
        }
      }
    } catch (requestError) {
      if (requestSequence === previewRequestSequence.current) {
        handleRequestError(
          requestError,
          automatic ? "無法更新即時預覽。" : "無法產生預覽。",
        );
      }
    } finally {
      if (requestSequence === previewRequestSequence.current) {
        setIsPreviewLoading(false);
      }
    }
  }

  async function loadArticle(slug: string, force = false) {
    if (isMutationInFlight) {
      return;
    }

    if (!force && isDirty && !window.confirm("目前有尚未儲存的變更，確定要離開嗎？")) {
      return;
    }

    const requestSequence = ++articleRequestSequence.current;
    const editorEpoch = ++editorEpochRef.current;
    syncGenerationRef.current += 1;
    previewRequestSequence.current += 1;
    setIsPreviewLoading(false);
    setIsArticleLoading(true);
    setError("");
    setMessage(`正在載入「${slug}」…`);
    setConflict(null);
    conflictRef.current = null;
    failedAutoSaveSnapshotRef.current = null;
    setPendingAction(null);

    try {
      const result = await adminRequest<{ article: AdminArticle }>(
        getAdminArticleApiPath(slug),
      );
      if (
        requestSequence !== articleRequestSequence.current ||
        editorEpoch !== editorEpochRef.current
      ) {
        return;
      }

      const nextForm = articleToForm(result.article);
      const nextBaseline = serializeForm(nextForm);
      selectedSlugRef.current = result.article.slug;
      revisionRef.current = result.article.revision;
      latestFormRef.current = nextForm;
      baselineRef.current = nextBaseline;
      isDirtyRef.current = false;
      setSelectedSlug(result.article.slug);
      setRevision(result.article.revision);
      resetMarkdownEditorHistory(nextForm.content);
      setForm(nextForm);
      setBaseline(nextBaseline);
      setHasAttemptedSubmit(false);
      setWorkspaceTab("editor");
      lastPreviewSnapshotRef.current = null;
      setPreviewHtml("");
      setLastSavedAt(result.article.updatedAt);
      setHeartbeatStatus("live");
      setMessage(`已載入「${result.article.title}」。`);
      expandArticleGroup(
        getAdminArticleGroupKey(
          result.article.pathSegments.length === 2
            ? (result.article.pathSegments[0] ?? null)
            : null,
        ),
      );
    } catch (requestError) {
      if (requestSequence === articleRequestSequence.current) {
        setMessage("");
        handleRequestError(requestError, "無法載入文章內容。");
      }
    } finally {
      if (requestSequence === articleRequestSequence.current) {
        setIsArticleLoading(false);
      }
    }
  }

  function expandArticleGroup(groupKey: string) {
    setCollapsedArticleGroups((current) => {
      if (!current.has(groupKey)) {
        return current;
      }

      const next = new Set(current);
      next.delete(groupKey);
      return next;
    });
  }

  function toggleArticleGroup(groupKey: string) {
    setCollapsedArticleGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  function startNewArticle(category: string | null = null) {
    if (isMutationInFlight || isArticleLoading) {
      return false;
    }

    if (isDirty && !window.confirm("目前有尚未儲存的變更，確定要建立新文章嗎？")) {
      return false;
    }

    articleRequestSequence.current += 1;
    editorEpochRef.current += 1;
    syncGenerationRef.current += 1;
    previewRequestSequence.current += 1;
    setIsPreviewLoading(false);
    const nextForm = {
      ...createNewArticleForm(domain),
      slug: category ? `${category}/` : "",
    };
    const nextBaseline = serializeForm(nextForm);
    selectedSlugRef.current = null;
    revisionRef.current = null;
    latestFormRef.current = nextForm;
    baselineRef.current = nextBaseline;
    isDirtyRef.current = false;
    conflictRef.current = null;
    failedAutoSaveSnapshotRef.current = null;
    setSelectedSlug(null);
    setRevision(null);
    resetMarkdownEditorHistory(nextForm.content);
    setForm(nextForm);
    setBaseline(nextBaseline);
    setHasAttemptedSubmit(false);
    lastPreviewSnapshotRef.current = null;
    setPreviewHtml("");
    setWorkspaceTab("editor");
    setConflict(null);
    setPendingAction(null);
    setError("");
    setLastSavedAt(null);
    setLastHeartbeatAt(null);
    setHeartbeatStatus("idle");
    setMessage(
      category
        ? `已在「${category}」開啟新草稿；請接著輸入文章名稱。`
        : "已在根目錄開啟新的繁體中文草稿。",
    );
    if (category) {
      expandArticleGroup(getAdminArticleGroupKey(category));
    } else {
      expandArticleGroup(ROOT_ARTICLE_GROUP_KEY);
    }
    window.setTimeout(() => formRef.current?.querySelector<HTMLElement>("#post-slug")?.focus());
    return true;
  }

  function createCategory(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const categoryName = newCategoryName.trim();
    const parsedCategory = parseSafeExistingBlogSlug(categoryName);

    if (!parsedCategory || parsedCategory.pathSegments.length !== 1) {
      setError("類別名稱必須是單層安全路徑，可使用 PascalCase、空格或 Unicode。");
      return;
    }

    const portableCategoryName = parsedCategory.slug.normalize("NFC").toLocaleLowerCase("en-US");
    const hasExistingCategory = articleGroups.some(
      (group) =>
        group.category?.normalize("NFC").toLocaleLowerCase("en-US") === portableCategoryName,
    );
    const conflictsWithRootArticle = posts.some(
      (post) =>
        post.pathSegments.length === 1 &&
        post.slug.normalize("NFC").toLocaleLowerCase("en-US") === portableCategoryName,
    );

    if (hasExistingCategory) {
      setError("這個類別已存在，請使用該類別標題旁的新增文章按鈕。");
      return;
    }

    if (conflictsWithRootArticle) {
      setError("同名路徑目前是一篇根目錄文章，不能同時作為文章類別。");
      return;
    }

    if (startNewArticle(parsedCategory.slug)) {
      setIsCreatingCategory(false);
      setNewCategoryName("");
      setError("");
      setMessage(
        `已建立「${parsedCategory.slug}」類別草稿；完成並儲存第一篇文章後會建立資料夾。`,
      );
    }
  }

  function updateField<Key extends keyof ArticleForm>(key: Key, value: ArticleForm[Key]) {
    const affectsPreview = key === "content" || key === "slug";
    const previewWasCurrent = affectsPreview && (Boolean(previewHtml) || isPreviewLoading);
    const nextForm = { ...latestFormRef.current, [key]: value };
    latestFormRef.current = nextForm;
    isDirtyRef.current = serializeForm(nextForm) !== baselineRef.current;
    if (affectsPreview) {
      previewRequestSequence.current += 1;
      setIsPreviewLoading(false);
    }
    setForm(nextForm);
    setMessage(previewWasCurrent ? "內容已變更；停止輸入 1 秒後會更新安全預覽。" : "");
  }

  function commitMarkdownHistory(nextHistory: MarkdownHistory) {
    markdownHistoryRef.current = nextHistory;
    setMarkdownHistory(nextHistory);
  }

  function resetMarkdownEditorHistory(value: string) {
    commitMarkdownHistory(
      resetMarkdownHistory(markdownHistoryRef.current, value, {
        direction: "none",
        end: 0,
        start: 0,
      }),
    );
  }

  function applyMarkdownHistory(nextHistory: MarkdownHistory) {
    if (nextHistory === markdownHistoryRef.current) {
      return;
    }

    commitMarkdownHistory(nextHistory);
    updateField("content", nextHistory.present.value);
  }

  function performMarkdownHistoryAction(action: "redo" | "undo") {
    applyMarkdownHistory(
      action === "undo"
        ? undoMarkdownHistory(markdownHistoryRef.current)
        : redoMarkdownHistory(markdownHistoryRef.current),
    );
  }

  function handleInlineMarkdownChange(value: string) {
    if (value.length > 500000) {
      setError("Markdown 正文不可超過 500,000 個字元。");
      return;
    }
    const nextHistory = recordMarkdownEdit(
      markdownHistoryRef.current,
      value,
      {
        direction: "none",
        end: value.length,
        start: value.length,
      },
      {
        inputType: "insertReplacementText",
        timestamp: window.performance.now(),
      },
    );
    commitMarkdownHistory(nextHistory);
    updateField("content", nextHistory.present.value);
  }

  function handleMarkdownComposingChange(isComposing: boolean) {
    markdownCompositionRef.current = isComposing;
    setIsMarkdownComposing(isComposing);
  }

  function validateForm() {
    setHasAttemptedSubmit(true);
    const formElement = formRef.current;

    if (!slugIsSafe) {
      formElement?.querySelector<HTMLElement>("#post-slug")?.focus();
      setError("Slug 必須是 1–2 層的安全文章路徑。");
      return false;
    }

    if (tagsAreInvalid) {
      formElement?.querySelector<HTMLElement>("#post-tags")?.focus();
      setError("標籤最多 20 個，且每個標籤不可超過 40 個字元。");
      return false;
    }

    if (!form.content.trim()) {
      formElement?.querySelector<HTMLElement>("#post-content textarea, #post-content button")?.focus();
      setError("Markdown 正文不可為空白。");
      return false;
    }

    if (!formElement?.reportValidity()) {
      const invalidElement = formElement?.querySelector<HTMLElement>(":invalid");
      invalidElement?.focus();
      setError("請先修正標示的必填欄位。");
      return false;
    }

    return true;
  }

  async function saveArticle(
    nextPublished = latestFormRef.current.published,
    saveMode: AdminSaveMode = "manual",
  ) {
    const isAutomatic = saveMode === "autosave";
    const submittedForm = latestFormRef.current;
    const submittedSnapshot = serializeForm(submittedForm);
    const submittedSlug = selectedSlugRef.current;
    const submittedRevision = revisionRef.current;
    const submittedTags = parseAdminTagInput(submittedForm.tags);
    const submittedTagsAreInvalid =
      submittedTags.length > 20 || submittedTags.some((tag) => tag.length > 40);
    const submittedIsPublishedEditor =
      initialSession.user.role !== "admin" && submittedForm.published;
    const editorEpoch = editorEpochRef.current;
    const formIsValid = Boolean(formRef.current?.checkValidity()) && !submittedTagsAreInvalid;

    if (isAutomatic) {
      if (
        !shouldAutosave({
          currentSnapshot: submittedSnapshot,
          failedSnapshot: failedAutoSaveSnapshotRef.current,
          hasConflict: Boolean(conflictRef.current),
          hasPendingAction: pendingAction !== null,
          hasSelectedArticle: Boolean(submittedSlug && submittedRevision),
          isBusy:
            saveInFlightRef.current ||
            isArticleLoading ||
            isSaving ||
            isLoggingOut ||
            markdownCompositionRef.current,
          isDirty: submittedSnapshot !== baselineRef.current,
          isFormValid: formIsValid,
          isOnline,
          isPublished: submittedForm.published,
          isPublishedEditor: submittedIsPublishedEditor,
          isVisible: isPageVisible,
        })
      ) {
        return;
      }
    } else if (
      saveInFlightRef.current ||
      conflictRef.current ||
      isArticleLoading ||
      isPreviewLoading ||
      !validateForm() ||
      submittedIsPublishedEditor
    ) {
      return;
    }

    saveInFlightRef.current = true;
    syncGenerationRef.current += 1;
    if (isAutomatic) {
      setIsAutoSaving(true);
    } else {
      setIsSaving(true);
    }
    setError("");
    setMessage("");
    setConflict(null);
    conflictRef.current = null;

    const payload = {
      ...(submittedForm.problem ? { problem: submittedForm.problem } : {}),
      ...(submittedForm.research ? { research: submittedForm.research } : {}),
      content: submittedForm.content,
      date: submittedForm.date,
      description: submittedForm.description,
      published: nextPublished,
      tags: submittedTags,
      title: submittedForm.title,
    };

    try {
      const result = submittedSlug
        ? await adminRequest<{ article: AdminArticle }>(
            getAdminArticleApiPath(submittedSlug),
            {
              body: JSON.stringify({
                ...payload,
                revision: submittedRevision,
                saveMode,
              }),
              method: "PUT",
            },
          )
        : await adminRequest<{ article: AdminArticle }>(apiRoot, {
            body: JSON.stringify({ ...payload, slug: submittedForm.slug }),
            method: "POST",
          });

      if (editorEpochRef.current !== editorEpoch) {
        return;
      }

      const committedForm = mergeCommittedArticleIdentity(submittedForm, result.article);
      const nextBaseline = serializeForm(committedForm);
      const hasNewerLocalChanges =
        serializeForm(latestFormRef.current) !== submittedSnapshot;
      selectedSlugRef.current = result.article.slug;
      revisionRef.current = result.article.revision;
      baselineRef.current = nextBaseline;
      setSelectedSlug(result.article.slug);
      setRevision(result.article.revision);
      setBaseline(nextBaseline);
      expandArticleGroup(
        getAdminArticleGroupKey(
          result.article.pathSegments.length === 2
            ? (result.article.pathSegments[0] ?? null)
            : null,
        ),
      );

      if (!hasNewerLocalChanges) {
        latestFormRef.current = committedForm;
        if (serializeForm(committedForm) !== submittedSnapshot) {
          setForm(committedForm);
        }
      }

      failedAutoSaveSnapshotRef.current = null;
      retryAutoSaveOnReconnectRef.current = false;
      setHasAttemptedSubmit(false);
      setPendingAction(null);
      setLastSavedAt(result.article.updatedAt);
      setHeartbeatStatus("live");
      setMessage(
        hasNewerLocalChanges
          ? "已儲存先前快照；較新的本機變更會在停止輸入 1 秒後繼續儲存。"
          : isAutomatic
          ? "已自動更新 main.md。"
          : result.article.published
            ? "文章已發布並建立手動版本。"
            : "草稿已儲存並建立手動版本。",
      );
      void refreshPosts({ silent: isAutomatic });
    } catch (requestError) {
      if (editorEpochRef.current !== editorEpoch) {
        return;
      }

      if (isAutomatic) {
        failedAutoSaveSnapshotRef.current = submittedSnapshot;
        retryAutoSaveOnReconnectRef.current = !(requestError instanceof AdminClientError);
      }

      if (requestError instanceof AdminClientError && requestError.code === "revision_conflict") {
        const details = requestError.details as
          | { currentRevision?: string; currentUpdatedAt?: string }
          | undefined;
        const nextConflict = details ?? {};
        conflictRef.current = nextConflict;
        retryAutoSaveOnReconnectRef.current = false;
        setConflict(nextConflict);
        setHeartbeatStatus("remote-change");
        setError("伺服器上的文章已有更新；本機內容仍保留，請重新載入後再合併。");
      } else {
        handleRequestError(
          requestError,
          isAutomatic
            ? "自動儲存失敗，本機內容仍保留；修改內容後會再次嘗試。"
            : "文章儲存失敗，本機內容仍保留。",
        );
      }
    } finally {
      saveInFlightRef.current = false;
      if (isAutomatic) {
        setIsAutoSaving(false);
      } else {
        setIsSaving(false);
      }
    }
  }

  useEffect(() => {
    const currentSnapshot = serializeForm(form);
    const formIsValid = Boolean(formRef.current?.checkValidity()) && !tagsAreInvalid;

    if (
      !shouldAutosave({
        currentSnapshot,
        failedSnapshot: failedAutoSaveSnapshotRef.current,
        hasConflict: Boolean(conflict),
        hasPendingAction: pendingAction !== null,
        hasSelectedArticle: Boolean(selectedSlug && revision),
        isBusy:
          isMutationInFlight ||
          isArticleLoading ||
          isLoggingOut ||
          isMarkdownComposing,
        isDirty,
        isFormValid: formIsValid,
        isOnline,
        isPublished: form.published,
        isPublishedEditor,
        isVisible: isPageVisible,
      })
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void saveArticle(form.published, "autosave");
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
    // saveArticle intentionally consumes the snapshot captured by this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    conflict,
    form,
    isArticleLoading,
    isDirty,
    isMutationInFlight,
    isOnline,
    isPageVisible,
    isPublishedEditor,
    isLoggingOut,
    isMarkdownComposing,
    pendingAction,
    revision,
    selectedSlug,
    tagsAreInvalid,
    autoSaveRetryEpoch,
  ]);

  useEffect(() => {
    const previewSnapshot = serializePreviewInput(form);

    if (
      !slugIsSafe ||
      !form.content.trim() ||
      lastPreviewSnapshotRef.current === previewSnapshot ||
      isArticleLoading ||
      isSaving ||
      isMarkdownComposing ||
      !isOnline ||
      !isPageVisible
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void requestPreview(form, { automatic: true });
    }, AUTO_SAVE_DELAY_MS);

    return () => window.clearTimeout(timeout);
    // requestPreview intentionally consumes the snapshot captured by this render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    form.content,
    form.slug,
    isArticleLoading,
    isMarkdownComposing,
    isOnline,
    isPageVisible,
    isSaving,
    slugIsSafe,
  ]);

  useEffect(() => {
    let disposed = false;
    let timeout: number | undefined;

    const scheduleNextHeartbeat = () => {
      if (!disposed) {
        timeout = window.setTimeout(checkRevision, HEARTBEAT_INTERVAL_MS);
      }
    };

    async function checkRevision() {
      let requestContext: {
        editorEpoch: number;
        generation: number;
        localRevision: string;
        slug: string;
      } | null = null;

      try {
        if (document.visibilityState !== "visible") {
          setHeartbeatStatus("paused");
          return;
        }

        if (!window.navigator.onLine) {
          setHeartbeatStatus("offline");
          return;
        }

        const slug = selectedSlugRef.current;
        const localRevision = revisionRef.current;

        if (!slug || !localRevision) {
          setHeartbeatStatus("idle");
          return;
        }

        if (conflictRef.current) {
          setHeartbeatStatus("remote-change");
          return;
        }

        const generation = syncGenerationRef.current;
        const editorEpoch = editorEpochRef.current;
        requestContext = { editorEpoch, generation, localRevision, slug };
        const result = await adminRequest<Pick<AdminArticle, "revision" | "updatedAt">>(
          `${getAdminArticleApiPath(slug)}?view=revision`,
        );

        if (
          disposed ||
          generation !== syncGenerationRef.current ||
          editorEpoch !== editorEpochRef.current ||
          slug !== selectedSlugRef.current ||
          localRevision !== revisionRef.current
        ) {
          return;
        }

        const action = getRevisionSyncAction({
          isDirty: isDirtyRef.current,
          isSaveInFlight: saveInFlightRef.current,
          localRevision,
          remoteRevision: result.revision,
        });

        if (action === "conflict") {
          const nextConflict = {
            currentRevision: result.revision,
            currentUpdatedAt: result.updatedAt,
          };
          conflictRef.current = nextConflict;
          retryAutoSaveOnReconnectRef.current = false;
          setConflict(nextConflict);
          setHeartbeatStatus("remote-change");
          setError("心跳偵測到遠端更新；本機內容仍保留，自動儲存已暫停。");
          return;
        }

        if (action === "reload") {
          const fullResult = await adminRequest<{ article: AdminArticle }>(
            getAdminArticleApiPath(slug),
          );

          if (
            disposed ||
            generation !== syncGenerationRef.current ||
            editorEpoch !== editorEpochRef.current ||
            slug !== selectedSlugRef.current ||
            localRevision !== revisionRef.current ||
            isDirtyRef.current ||
            saveInFlightRef.current
          ) {
            return;
          }

          const nextForm = articleToForm(fullResult.article);
          const nextBaseline = serializeForm(nextForm);
          latestFormRef.current = nextForm;
          baselineRef.current = nextBaseline;
          revisionRef.current = fullResult.article.revision;
          isDirtyRef.current = false;
          conflictRef.current = null;
          failedAutoSaveSnapshotRef.current = null;
          previewRequestSequence.current += 1;
          setIsPreviewLoading(false);
          lastPreviewSnapshotRef.current = null;
          setPreviewHtml("");
          const nextMarkdownHistory = resetMarkdownHistory(
            markdownHistoryRef.current,
            nextForm.content,
          );
          markdownHistoryRef.current = nextMarkdownHistory;
          setMarkdownHistory(nextMarkdownHistory);
          setForm(nextForm);
          setBaseline(nextBaseline);
          setRevision(fullResult.article.revision);
          setConflict(null);
          setError("");
          setWorkspaceTab("editor");
          setPosts((current) =>
            current.map((post) =>
              post.slug === fullResult.article.slug
                ? articleToListItem(fullResult.article)
                : post,
            ),
          );
          setHasAttemptedSubmit(false);
          setLastSavedAt(fullResult.article.updatedAt);
          setMessage("心跳偵測到新版本，已同步最新 main.md。");
        }

        if (
          retryAutoSaveOnReconnectRef.current &&
          failedAutoSaveSnapshotRef.current !== null
        ) {
          failedAutoSaveSnapshotRef.current = null;
          retryAutoSaveOnReconnectRef.current = false;
          setAutoSaveRetryEpoch((current) => current + 1);
        }

        setLastHeartbeatAt(new Date().toISOString());
        setHeartbeatStatus("live");
      } catch (requestError) {
        if (disposed) {
          return;
        }

        if (requestError instanceof AdminClientError && requestError.status === 401) {
          window.location.assign("/admin/login?reason=session-expired");
          return;
        }

        if (
          !requestContext ||
          requestContext.generation !== syncGenerationRef.current ||
          requestContext.editorEpoch !== editorEpochRef.current ||
          requestContext.slug !== selectedSlugRef.current ||
          requestContext.localRevision !== revisionRef.current
        ) {
          return;
        }

        if (
          requestError instanceof AdminClientError &&
          requestError.code === "article_not_found" &&
          selectedSlugRef.current
        ) {
          const nextConflict = {};
          conflictRef.current = nextConflict;
          setConflict(nextConflict);
          setHeartbeatStatus("remote-change");
          setError("目前文章已在其他位置被封存或移除；本機內容仍保留。");
          return;
        }

        setHeartbeatStatus(window.navigator.onLine ? "error" : "offline");
      } finally {
        scheduleNextHeartbeat();
      }
    }

    timeout = window.setTimeout(checkRevision, HEARTBEAT_INTERVAL_MS);

    return () => {
      disposed = true;
      if (timeout !== undefined) {
        window.clearTimeout(timeout);
      }
    };
  }, [getAdminArticleApiPath]);

  async function archiveArticle() {
    if (
      !selectedSlug ||
      !isAdmin ||
      conflictRef.current ||
      isMutationInFlight ||
      isArticleLoading ||
      isPreviewLoading
    ) {
      return;
    }

    saveInFlightRef.current = true;
    syncGenerationRef.current += 1;
    setIsSaving(true);
    setError("");

    try {
      await adminRequest<{ archive: { archiveId: string } }>(
        getAdminArticleApiPath(selectedSlug),
        { method: "DELETE" },
      );
      const archivedSlug = selectedSlug;
      const nextForm = createNewArticleForm(domain);
      const nextBaseline = serializeForm(nextForm);
      editorEpochRef.current += 1;
      selectedSlugRef.current = null;
      revisionRef.current = null;
      latestFormRef.current = nextForm;
      baselineRef.current = nextBaseline;
      isDirtyRef.current = false;
      conflictRef.current = null;
      failedAutoSaveSnapshotRef.current = null;
      setSelectedSlug(null);
      setRevision(null);
      resetMarkdownEditorHistory(nextForm.content);
      setForm(nextForm);
      setBaseline(nextBaseline);
      setHasAttemptedSubmit(false);
      lastPreviewSnapshotRef.current = null;
      setPreviewHtml("");
      setPendingAction(null);
      setConflict(null);
      setLastSavedAt(null);
      setLastHeartbeatAt(null);
      setHeartbeatStatus("idle");
      setMessage(`「${archivedSlug}」已移至可復原封存區。`);
      void refreshPosts();
    } catch (requestError) {
      handleRequestError(requestError, "文章封存失敗。");
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }
  }

  async function copyLocalMarkdown() {
    try {
      await navigator.clipboard.writeText(
        serializeFrontmatter(
          {
            date: form.date,
            published: form.published,
            summary: form.description,
            tags: parsedTags,
            title: form.title,
            ...(form.problem ? { kind: "leetcode", ...form.problem } : {}),
            ...(form.research ? {
              kind: "research",
              researchArea: form.research.area,
              researchRank: form.research.rank,
              researchStage: form.research.stage,
            } : {}),
          },
          form.content,
        ),
      );
      setMessage("本機完整草稿（front matter 與正文）已複製，可在重新載入後手動合併。");
    } catch {
      setError("瀏覽器無法存取剪貼簿，請直接從編輯器複製內容。");
    }
  }

  async function logout() {
    if (isMutationInFlight || isArticleLoading) {
      return;
    }

    if (isDirty && !window.confirm("目前有尚未儲存的變更，確定要登出並放棄這些變更嗎？")) {
      return;
    }

    syncGenerationRef.current += 1;
    setIsLoggingOut(true);

    try {
      await adminRequest<{ loggedOut: boolean }>("/api/admin/auth/logout", {
        method: "POST",
      });
      skipBeforeUnloadRef.current = true;
      window.location.assign("/admin/login");
    } catch (requestError) {
      handleRequestError(requestError, "登出失敗，請再試一次。");
      setIsLoggingOut(false);
    }
  }

  function requestLifecycleAction(action: Exclude<PendingAction, null>) {
    lifecycleTriggerRef.current = document.activeElement as HTMLElement | null;
    setPendingAction(action);
  }

  const confirmationCopy = pendingAction
    ? {
        archive: {
          body: `「${form.title || form.slug}」會移出公開內容目錄並保留於封存區，可由維運人員復原。${isDirty ? "目前尚未儲存的本機變更不會被封存。" : ""}`,
          title: "確認封存文章",
        },
        publish: {
          body: `「${form.title || form.slug}」儲存後會立即出現在公開 ${publicLabel}。`,
          title: "確認發布文章",
        },
        unpublish: {
          body: `「${form.title || form.slug}」會立即從公開 ${publicLabel} 隱藏，但仍保留在後台。`,
          title: "確認取消發布",
        },
      }[pendingAction]
    : null;

  return (
    <div className="admin-editor pb-16">
      <MarkdownCopyButtons />
      <div className="workspace-canvas">
        <header className="mb-6 flex flex-col gap-4 border-b border-[#26344d] pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.2em] text-[#8ed2d8]">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              Content workspace
            </div>
            <h1
              className="font-mono text-2xl font-black tracking-tight text-slate-50 outline-none focus-visible:ring-2 focus-visible:ring-cyan-200"
              ref={consoleHeadingRef}
              tabIndex={-1}
            >
              {publicLabel} 工作區
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">
              管理 Markdown 文章的草稿、預覽與發布狀態。每次寫入都會驗證版本，避免覆蓋他人的更新。
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <div className="rounded border border-[#30445f] bg-[#0b1220] px-3 py-2 text-slate-300">
              <span className="text-slate-400">IDENTITY / </span>
              {initialSession.user.displayName}
              <span className="ml-2 text-[#8ed2d8]">{initialSession.user.role}</span>
            </div>
            <div
              aria-label={`同步狀態：${heartbeatLabels[heartbeatStatus]}`}
              className="flex items-center gap-2 rounded border border-[#30445f] bg-[#0b1220] px-3 py-2 text-slate-300"
              title={
                lastHeartbeatAt
                  ? `最後心跳：${formatAdminUpdatedAt(lastHeartbeatAt)}`
                  : "選取文章後，每秒檢查遠端 revision。"
              }
            >
              <Activity
                aria-hidden="true"
                className={`h-3.5 w-3.5 ${
                  heartbeatStatus === "live"
                    ? "animate-[pulse_1s_ease-in-out_infinite] text-emerald-300"
                    : heartbeatStatus === "remote-change"
                      ? "text-rose-300"
                      : heartbeatStatus === "error" || heartbeatStatus === "offline"
                        ? "text-amber-300"
                        : "text-slate-400"
                }`}
              />
              {heartbeatLabels[heartbeatStatus]}
            </div>
            <NeonButton
              aria-label="登出後台"
              className={disabledButtonClass}
              disabled={isLoggingOut || isMutationInFlight || isArticleLoading}
              onClick={() => void logout()}
              variant="ghost"
            >
              {isLoggingOut ? (
                <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut aria-hidden="true" className="h-4 w-4" />
              )}
              登出
            </NeonButton>
          </div>
        </header>

        <div aria-live="polite" className="mb-4 min-h-6 text-sm" role="status">
          {message ? <p className="text-[#b9dfe3]">{message}</p> : null}
        </div>
        {error ? (
          <div
            className="mb-5 flex items-start justify-between gap-4 rounded border border-rose-400/35 bg-rose-950/25 px-4 py-3 text-sm text-rose-100"
            role="alert"
          >
            <p>{error}</p>
            <button
              aria-label="關閉錯誤訊息"
              className="rounded p-1 text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
              onClick={() => setError("")}
              type="button"
            >
              <X aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        ) : null}

        {conflict ? (
          <div
            className="mb-5 rounded border border-amber-300/40 bg-amber-950/20 p-4 outline-none focus-visible:ring-2 focus-visible:ring-amber-200"
            ref={conflictAlertRef}
            role="alert"
            tabIndex={-1}
          >
            <h2 className="font-mono font-bold text-amber-100">偵測到過期版本（409）</h2>
            <p className="mt-1 text-sm leading-6 text-amber-100/75">
              系統沒有覆蓋伺服器的新版本。請先複製本機 Markdown，再重新載入並手動合併。
              {conflict.currentUpdatedAt
                ? ` 最新版本更新於 ${formatAdminUpdatedAt(conflict.currentUpdatedAt)}。`
                : ""}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <NeonButton accent="amber" onClick={() => void copyLocalMarkdown()} variant="secondary">
                <Copy aria-hidden="true" className="h-4 w-4" />
                複製本機完整草稿
              </NeonButton>
              <NeonButton
                onClick={() => selectedSlug && void loadArticle(selectedSlug, true)}
                variant="secondary"
              >
                <RotateCcw aria-hidden="true" className="h-4 w-4" />
                重新載入最新版本
              </NeonButton>
            </div>
          </div>
        ) : null}

        {confirmationCopy ? (
          <div
            aria-describedby="lifecycle-confirmation-description"
            aria-labelledby="lifecycle-confirmation-title"
            className="mb-5 rounded border border-amber-300/45 bg-[#21180d] p-4 shadow-[0_0_24px_rgba(199,150,88,0.08)]"
            role="alertdialog"
          >
            <h2
              className="font-mono text-base font-black text-amber-100"
              id="lifecycle-confirmation-title"
            >
              {confirmationCopy.title}
            </h2>
            <p
              className="mt-1 text-sm leading-6 text-amber-100/75"
              id="lifecycle-confirmation-description"
            >
              {confirmationCopy.body}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <NeonButton
                accent="amber"
                className={disabledButtonClass}
                disabled={
                  isMutationInFlight ||
                  isArticleLoading ||
                  isPreviewLoading ||
                  Boolean(conflict)
                }
                onClick={() => {
                  if (pendingAction === "archive") void archiveArticle();
                  if (pendingAction === "publish") void saveArticle(true);
                  if (pendingAction === "unpublish") void saveArticle(false);
                }}
              >
                確認執行
              </NeonButton>
              <NeonButton
                autoFocus
                className={disabledButtonClass}
                disabled={isMutationInFlight}
                onClick={() => setPendingAction(null)}
                variant="ghost"
              >
                取消
              </NeonButton>
            </div>
          </div>
        ) : null}

        <div
          className={`studio-layout ${isSidebarCollapsed ? "studio-layout--focused" : ""}`}
        >
          {!isSidebarCollapsed ? (
            <PixelCard
              aria-busy={isListLoading}
              as="section"
              className="studio-library h-fit p-0"
            >
            <div className="border-b border-[#26344d] p-4">
              <div className="mb-4">
                <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold uppercase tracking-[0.16em] text-[#8ed2d8]">
                    {publicLabel}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{posts.length} records in view</p>
                </div>
                <button
                  aria-label="收合文章側欄"
                  className="rounded border border-[#30445f] p-2 text-slate-300 transition hover:border-[#6ea8b0] hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                  onClick={() => setIsSidebarCollapsed(true)}
                  title="收合側欄，擴大編輯與預覽區"
                  type="button"
                >
                  <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
                </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <NeonButton
                    aria-label="在根目錄建立新文章"
                    className={disabledButtonClass}
                    disabled={isMutationInFlight || isArticleLoading || isPreviewLoading}
                    onClick={() => startNewArticle()}
                    size="md"
                    variant="secondary"
                  >
                    <FilePlus2 aria-hidden="true" className="h-4 w-4" />
                    新增文章
                  </NeonButton>
                  <NeonButton
                    aria-expanded={isCreatingCategory}
                    aria-label="建立新文章類別"
                    className={disabledButtonClass}
                    disabled={isMutationInFlight || isArticleLoading || isPreviewLoading}
                    onClick={() => {
                      setIsCreatingCategory((current) => !current);
                      setError("");
                    }}
                    size="md"
                    variant="secondary"
                  >
                    <FolderPlus aria-hidden="true" className="h-4 w-4" />
                    新增類別
                  </NeonButton>
                </div>
              </div>
              {isCreatingCategory ? (
                <form className="mb-4 rounded border border-[#30445f] bg-[#070c18] p-3" onSubmit={createCategory}>
                  <label className="block text-xs font-semibold text-slate-300" htmlFor="new-category-name">
                    類別名稱
                  </label>
                  <input
                    autoFocus
                    className="mt-2 h-10 w-full rounded border border-[#30445f] bg-[#050914] px-3 font-mono text-sm text-cyan-100 outline-none focus:border-[#6ea8b0] focus:ring-2 focus:ring-cyan-300/20"
                    id="new-category-name"
                    maxLength={255}
                    onChange={(event) => setNewCategoryName(event.target.value)}
                    placeholder="WebsiteDesign"
                    required
                    value={newCategoryName}
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-400">
                    儲存第一篇文章時才會建立實體資料夾。
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      className="rounded border border-cyan-300/35 px-3 py-1.5 font-mono text-xs font-bold text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                      type="submit"
                    >
                      建立並新增文章
                    </button>
                    <button
                      className="rounded px-3 py-1.5 font-mono text-xs text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                      onClick={() => {
                        setIsCreatingCategory(false);
                        setNewCategoryName("");
                      }}
                      type="button"
                    >
                      取消
                    </button>
                  </div>
                </form>
              ) : null}
              <label className="sr-only" htmlFor="admin-post-search">
                搜尋文章標題、slug 或標籤
              </label>
              <div className="relative">
                <Search
                  aria-hidden="true"
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                />
                <input
                  className="h-11 w-full rounded border border-[#26344d] bg-[#050914] pl-10 pr-3 text-sm text-slate-100 outline-none placeholder:text-slate-400 focus:border-[#6ea8b0] focus:ring-2 focus:ring-cyan-300/20"
                  disabled={isSaving}
                  id="admin-post-search"
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="搜尋標題、slug 或標籤…"
                  type="search"
                  value={query}
                />
              </div>
              <label
                className="mt-3 flex items-center gap-2 font-mono text-xs text-slate-400"
                htmlFor="admin-post-status"
              >
                <ListFilter aria-hidden="true" className="h-4 w-4" />
                狀態篩選
              </label>
              <select
                className="mt-2 h-10 w-full rounded border border-[#26344d] bg-[#0b1220] px-3 text-sm text-slate-200 outline-none focus:border-[#6ea8b0] focus:ring-2 focus:ring-cyan-300/20"
                disabled={isSaving}
                id="admin-post-status"
                onChange={(event) => setStatus(event.target.value as AdminArticleStatus)}
                value={status}
              >
                <option value="all">全部狀態</option>
                <option value="draft">草稿</option>
                <option value="published">已發布</option>
              </select>
            </div>

            <div className="pixel-scrollbar max-h-[36rem] overflow-y-auto p-2 xl:max-h-[calc(100vh-23rem)]">
              {isListLoading ? (
                <div className="flex items-center gap-2 px-3 py-8 text-sm text-slate-400" role="status">
                  <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                  正在同步文章索引…
                </div>
              ) : listError ? (
                <div className="px-3 py-8 text-sm leading-6 text-rose-100" role="alert">
                  <p>{listError}</p>
                  <button
                    className="mt-3 rounded border border-rose-300/45 px-3 py-1.5 font-mono text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200"
                    onClick={() => void refreshPosts()}
                    type="button"
                  >
                    重新載入清單
                  </button>
                </div>
              ) : posts.length === 0 ? (
                <div className="px-3 py-8 text-sm leading-6 text-slate-400">
                  {query || status !== "all"
                    ? "沒有符合目前搜尋與篩選條件的文章。"
                    : "尚未建立文章。按「新增」開啟第一篇草稿。"}
                </div>
              ) : (
                <div className="space-y-2">
                  {articleGroups.map((group) => {
                    const isGroupCollapsed = collapsedArticleGroups.has(group.key);

                    return (
                      <section className="rounded border border-[#1d2a40] bg-[#060b15]" key={group.key}>
                        <div className="flex items-center gap-1 p-1.5">
                          <button
                            aria-expanded={!isGroupCollapsed}
                            className="flex min-w-0 flex-1 items-center gap-2 rounded px-2 py-2 text-left text-slate-200 transition hover:bg-[#0b1220] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                            onClick={() => toggleArticleGroup(group.key)}
                            type="button"
                          >
                            {isGroupCollapsed ? (
                              <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                            ) : (
                              <ChevronDown aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
                            )}
                            <Folder aria-hidden="true" className="h-4 w-4 shrink-0 text-amber-200" />
                            <span className="truncate font-mono text-xs font-bold">{group.label}</span>
                            <span className="ml-auto shrink-0 font-mono text-[0.65rem] text-slate-500">
                              {group.articles.length}
                            </span>
                          </button>
                          <button
                            aria-label={`在「${group.label}」建立新文章`}
                            className="rounded p-2 text-cyan-200 transition hover:bg-[#132337] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 disabled:opacity-45"
                            disabled={isMutationInFlight || isArticleLoading || isPreviewLoading}
                            onClick={() => startNewArticle(group.category)}
                            title={`在「${group.label}」建立新文章`}
                            type="button"
                          >
                            <FilePlus2 aria-hidden="true" className="h-4 w-4" />
                          </button>
                        </div>

                        {!isGroupCollapsed ? (
                          <ul className="mb-2 ml-5 space-y-1 border-l border-[#26344d] pl-2 pr-2">
                            {group.articles.map((post) => (
                              <li key={post.slug}>
                                <button
                                  aria-current={selectedSlug === post.slug ? "true" : undefined}
                                  className={`w-full rounded border px-3 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${
                                    selectedSlug === post.slug
                                      ? "border-[#6ea8b0] bg-[#132337]"
                                      : "border-transparent bg-[#070c18] hover:border-[#30445f] hover:bg-[#0b1220]"
                                  }`}
                                  disabled={isMutationInFlight || isArticleLoading}
                                  onClick={() => void loadArticle(post.slug)}
                                  type="button"
                                >
                                  <span className="flex items-start justify-between gap-3">
                                    <span className="min-w-0">
                                      <span className="block truncate text-sm font-bold text-slate-100">
                                        {post.title}
                                      </span>
                                      <span className="mt-1 block break-all font-mono text-[0.68rem] text-slate-400">
                                        /{getAdminArticleLeafSlug(post)}
                                      </span>
                                    </span>
                                    <span
                                      className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[0.62rem] font-black uppercase tracking-wide ${
                                        post.published
                                          ? "border-amber-300/35 bg-amber-950/25 text-amber-200"
                                          : "border-cyan-300/25 bg-cyan-950/20 text-cyan-200"
                                      }`}
                                    >
                                      {post.published ? "published" : "draft"}
                                    </span>
                                  </span>
                                  <span className="mt-2 block font-mono text-[0.65rem] text-slate-400">
                                    UPDATED {formatAdminUpdatedAt(post.updatedAt)}
                                  </span>
                                </button>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
            </PixelCard>
          ) : null}

          <section className="studio-workbench" aria-busy={isArticleLoading || isMutationInFlight}>
            {isSidebarCollapsed ? (
              <button
                aria-label="展開文章側欄"
                className="mb-3 inline-flex items-center gap-2 rounded border border-[#30445f] bg-[#0b1220] px-3 py-2 font-mono text-xs font-bold text-cyan-100 transition hover:border-[#6ea8b0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50"
                onClick={() => setIsSidebarCollapsed(false)}
                type="button"
              >
                <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
                展開文章樹
              </button>
            ) : null}
            <PixelCard className="studio-toolbar mb-4 flex flex-col gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded border px-2 py-1 font-mono text-[0.68rem] font-black uppercase ${
                      form.published
                        ? "border-amber-300/40 text-amber-200"
                        : "border-cyan-300/30 text-cyan-200"
                    }`}
                  >
                    {form.published ? "published" : "draft"}
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {isMarkdownComposing
                      ? "IME COMPOSITION — SYNC PAUSED"
                      : isAutoSaving
                        ? "AUTOSAVING MAIN.MD"
                      : isSaving
                        ? "SAVING DRAFT"
                        : conflict
                          ? "SYNC CONFLICT — LOCAL KEPT"
                          : isDirty
                            ? form.published && hasSelection
                              ? "AUTOSAVE IN 1S"
                              : "MANUAL SAVE REQUIRED"
                            : form.published && hasSelection
                              ? "REVISION SYNCED"
                              : hasSelection
                                ? "DRAFT SAVED"
                              : "NEW RECORD"}
                  </span>
                </div>
                <p className="mt-2 truncate font-mono text-sm text-slate-300">
                  {form.slug ? `${domain === "leetcode" ? "content/leetcode" : domain === "research" ? "content/research" : "content/blog"}/${form.slug}/main.md` : "等待指定新的 slug"}
                </p>
                {lastSavedAt ? (
                  <p className="mt-1 font-mono text-[0.68rem] text-slate-400">
                    LAST SAVED {formatAdminUpdatedAt(lastSavedAt)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {!form.published ? (
                  <NeonButton
                    className={disabledButtonClass}
                    disabled={
                      isMutationInFlight ||
                      isArticleLoading ||
                      isPreviewLoading ||
                      Boolean(conflict) ||
                      isPublishedEditor
                    }
                    onClick={() => void saveArticle(false)}
                    title="儲存未發布內容；草稿不會自動同步到 main.md。"
                    variant="secondary"
                  >
                    {isSaving ? (
                      <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save aria-hidden="true" className="h-4 w-4" />
                    )}
                    儲存草稿
                  </NeonButton>
                ) : null}
                {isAdmin ? (
                  <NeonButton
                    accent="amber"
                    className={disabledButtonClass}
                    disabled={
                      isMutationInFlight ||
                      isArticleLoading ||
                      isPreviewLoading ||
                      Boolean(conflict)
                    }
                    onClick={() =>
                      requestLifecycleAction(form.published ? "unpublish" : "publish")
                    }
                  >
                    <Flame aria-hidden="true" className="h-4 w-4" />
                    {form.published ? "取消發布" : "發布"}
                  </NeonButton>
                ) : null}
                {isAdmin && hasSelection ? (
                  <NeonButton
                    accent="amber"
                    className={disabledButtonClass}
                    disabled={
                      isMutationInFlight ||
                      isArticleLoading ||
                      isPreviewLoading ||
                      Boolean(conflict)
                    }
                    onClick={() => requestLifecycleAction("archive")}
                    variant="ghost"
                  >
                    <Archive aria-hidden="true" className="h-4 w-4" />
                    封存
                  </NeonButton>
                ) : null}
              </div>
            </PixelCard>

            {form.problem && (form.problem.entryType === "note" || form.problem.entryType === "template") ? (
              <p className="content-caption">LeetCode / {form.problem.entryType === "note" ? "學習筆記" : "模板草稿"} · 不使用題號、難度與解題進度。</p>
            ) : null}
            {form.problem?.format === "legacy" ? <p className="content-caption">舊版筆記：保留原段落，可直接編輯，不要求改套新版模板。</p> : null}
            {form.problem && (!form.problem.entryType || form.problem.entryType === "problem") ? (
              <fieldset className="content-filters mb-4" disabled={isMutationInFlight || isArticleLoading || isPublishedEditor}>
                <legend className="sr-only">題目資料</legend>
                <label>題號<input type="number" min="1" value={form.problem.id ?? ""} onChange={(e) => updateField("problem", { ...form.problem!, id: Number(e.target.value) })} /></label>
                <label>難度<select value={form.problem.difficulty ?? ""} onChange={(e) => updateField("problem", { ...form.problem!, difficulty: e.target.value as ProblemMetadata["difficulty"] })}>{["Easy","Medium","Hard"].map((v) => <option key={v}>{v}</option>)}</select></label>
                <label>進度<select value={form.problem.status ?? ""} onChange={(e) => updateField("problem", { ...form.problem!, status: e.target.value as ProblemMetadata["status"] })}>{["Todo","Attempted","Solved","Review"].map((v) => <option key={v}>{v}</option>)}</select></label>
                <label>語言<input maxLength={40} value={form.problem.language ?? ""} onChange={(e) => updateField("problem", { ...form.problem!, language: e.target.value })} /></label>
              </fieldset>
            ) : null}
            {form.research ? (
              <fieldset className="content-filters mb-4" disabled={isMutationInFlight || isArticleLoading || isPublishedEditor}>
                <legend className="sr-only">研究資料</legend>
                <label>研究領域<input maxLength={80} required value={form.research.area} onChange={(e) => updateField("research", { ...form.research!, area: e.target.value })} /></label>
                <label>展示排序<input type="number" min="0" max="999" required value={form.research.rank} onChange={(e) => updateField("research", { ...form.research!, rank: Number(e.target.value) })} /></label>
                <label>研究階段<select value={form.research.stage} onChange={(e) => updateField("research", { ...form.research!, stage: e.target.value as ResearchMetadata["stage"] })}><option value="exploring">探索中</option><option value="implementing">實作中</option><option value="evaluating">評估中</option><option value="published">成果整理</option></select></label>
              </fieldset>
            ) : null}
            {isPublishedEditor ? (
              <div className="mb-4 rounded border border-[#405434] bg-[#10180c] px-4 py-3 text-sm text-[#d4e8b5]">
                此文章已發布。Editor 可檢視與預覽，但只有 admin 能修改、取消發布或封存。
              </div>
            ) : null}
            {form.published && isAdmin ? (
              <div className="mb-4 rounded border border-amber-300/30 bg-amber-950/15 px-4 py-3 text-sm text-amber-100/80">
                此文章已發布；編輯內容會直接預覽，停止輸入 1 秒後自動同步 main.md，並立即反映到公開網站。
              </div>
            ) : null}
            {!form.published && !isPublishedEditor ? (
              <div className="mb-4 rounded border border-cyan-300/25 bg-cyan-950/10 px-4 py-3 text-sm text-cyan-100/75">
                草稿會即時預覽，但不會自動寫入 main.md；請使用「儲存草稿」或「發布」提交內容。
              </div>
            ) : null}

            <div className="studio-view-tabs mb-3 flex rounded border border-[#26344d] bg-[#050914] p-1" role="group" aria-label="編輯區檢視">
              <button
                aria-pressed={workspaceTab === "editor"}
                className={`flex-1 rounded px-3 py-2 font-mono text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${
                  workspaceTab === "editor" ? "bg-[#132337] text-cyan-100" : "text-slate-400"
                }`}
                onClick={() => setWorkspaceTab("editor")}
                type="button"
              >
                <PencilLine aria-hidden="true" className="mr-2 inline h-4 w-4" />
                整合編輯
              </button>
              <button
                aria-pressed={workspaceTab === "preview"}
                className={`flex-1 rounded px-3 py-2 font-mono text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50 ${
                  workspaceTab === "preview" ? "bg-[#132337] text-cyan-100" : "text-slate-400"
                }`}
                onClick={() => setWorkspaceTab("preview")}
                type="button"
              >
                <Eye aria-hidden="true" className="mr-2 inline h-4 w-4" />
                完整預覽
              </button>
            </div>

            <div className="studio-panes studio-panes--inline">
              <PixelCard
                as="section"
                className={`studio-pane studio-source ${workspaceTab === "editor" ? "studio-pane--active" : ""}`}
              >
                <div className="mb-4 flex items-center justify-between border-b border-[#26344d] pb-3">
                  <h2 className="font-mono text-sm font-black uppercase tracking-[0.12em] text-slate-100">
                    Markdown 編輯
                  </h2>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      aria-label="復原 Markdown 編輯"
                      className={`${disabledButtonClass} inline-flex items-center gap-1 rounded border border-[#30445f] px-2 py-1 font-mono text-[0.65rem] font-bold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50`}
                      disabled={
                        !canUndoMarkdown(markdownHistory) ||
                        isArticleLoading ||
                        isSaving ||
                        isPublishedEditor
                      }
                      onClick={() => performMarkdownHistoryAction("undo")}
                      title="復原 Markdown（Ctrl/⌘+Z）"
                      type="button"
                    >
                      <Undo2 aria-hidden="true" className="h-3.5 w-3.5" />
                      復原
                    </button>
                    <button
                      aria-label="重做 Markdown 編輯"
                      className={`${disabledButtonClass} inline-flex items-center gap-1 rounded border border-[#30445f] px-2 py-1 font-mono text-[0.65rem] font-bold text-slate-300 hover:border-cyan-300/40 hover:text-cyan-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/50`}
                      disabled={
                        !canRedoMarkdown(markdownHistory) ||
                        isArticleLoading ||
                        isSaving ||
                        isPublishedEditor
                      }
                      onClick={() => performMarkdownHistoryAction("redo")}
                      title="重做 Markdown（Ctrl/⌘+Shift+Z 或 Ctrl/⌘+Y）"
                      type="button"
                    >
                      <Redo2 aria-hidden="true" className="h-3.5 w-3.5" />
                      重做
                    </button>
                    <span className="font-mono text-[0.65rem] text-slate-400">
                      UTF-8 / ATOMIC WRITE
                    </span>
                  </div>
                </div>
                <form autoComplete="off" onSubmit={(event) => event.preventDefault()} ref={formRef}>
                  <fieldset
                    className="space-y-4"
                    disabled={isArticleLoading || isSaving || isPublishedEditor}
                  >
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-300" htmlFor="post-slug">
                        Slug <span aria-hidden="true" className="text-amber-300">*</span>
                      </label>
                      <input
                        aria-describedby="post-slug-help"
                        aria-invalid={hasAttemptedSubmit && !slugIsSafe}
                        className="h-11 w-full rounded border border-[#26344d] bg-[#050914] px-3 font-mono text-sm text-cyan-100 outline-none invalid:border-rose-400 focus:border-[#6ea8b0] focus:ring-2 focus:ring-cyan-300/20 disabled:opacity-60"
                        disabled={hasSelection || isArticleLoading || isPublishedEditor}
                        id="post-slug"
                        maxLength={MAXIMUM_EXISTING_BLOG_SLUG_LENGTH}
                        onChange={(event) => updateField("slug", event.target.value)}
                        placeholder="LeetCodeEssential150/2.AddTwoNumbers"
                        required
                        value={form.slug}
                      />
                      <p className="mt-1 text-xs text-slate-400" id="post-slug-help">
                        {hasSelection
                          ? "沿用既有安全路徑；建立後不可更名。"
                          : form.slug.endsWith("/")
                            ? "已選好類別；請在斜線後輸入文章名稱。可沿用 PascalCase、點號、括號、空格或 Unicode。"
                            : "新文章使用 1–2 層安全路徑，可沿用 PascalCase、點號、括號、空格或 Unicode；建立後不可更名。"}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-slate-300" htmlFor="post-title">
                        標題 <span aria-hidden="true" className="text-amber-300">*</span>
                      </label>
                      <input
                        aria-invalid={hasAttemptedSubmit && !form.title.trim()}
                        className="h-11 w-full rounded border border-[#26344d] bg-[#050914] px-3 text-sm text-slate-100 outline-none invalid:border-rose-400 focus:border-[#6ea8b0] focus:ring-2 focus:ring-cyan-300/20"
                        id="post-title"
                        maxLength={160}
                        onChange={(event) => updateField("title", event.target.value)}
                        required
                        value={form.title}
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-300" htmlFor="post-tags">
                          標籤
                        </label>
                        <textarea
                          aria-describedby="post-tags-help"
                          aria-invalid={hasAttemptedSubmit && tagsAreInvalid}
                          className="min-h-20 w-full resize-y rounded border border-[#26344d] bg-[#050914] px-3 py-2 text-sm leading-6 text-slate-100 outline-none focus:border-[#6ea8b0] focus:ring-2 focus:ring-cyan-300/20"
                          id="post-tags"
                          onChange={(event) => updateField("tags", event.target.value)}
                          placeholder={"Next.js\nCMS\nSecurity"}
                          value={form.tags}
                        />
                        <p className="mt-1 text-xs text-slate-400" id="post-tags-help">
                          每行一個標籤；最多 20 個，每個最多 40 個字元（可包含逗號）。
                        </p>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-300" htmlFor="post-date">
                          日期 <span aria-hidden="true" className="text-amber-300">*</span>
                        </label>
                        <input
                          aria-invalid={hasAttemptedSubmit && !form.date}
                          className="h-11 w-full rounded border border-[#26344d] bg-[#050914] px-3 text-sm text-slate-100 outline-none invalid:border-rose-400 focus:border-[#6ea8b0] focus:ring-2 focus:ring-cyan-300/20"
                          id="post-date"
                          onChange={(event) => updateField("date", event.target.value)}
                          required
                          type="date"
                          value={form.date}
                        />
                      </div>
                    </div>
                    <div>
                      <label
                        className="mb-1.5 block text-sm font-semibold text-slate-300"
                        htmlFor="post-description"
                      >
                        摘要 <span aria-hidden="true" className="text-amber-300">*</span>
                      </label>
                      <textarea
                        aria-invalid={hasAttemptedSubmit && !form.description.trim()}
                        className="min-h-24 w-full resize-y rounded border border-[#26344d] bg-[#050914] px-3 py-2 text-sm leading-6 text-slate-100 outline-none invalid:border-rose-400 focus:border-[#6ea8b0] focus:ring-2 focus:ring-cyan-300/20"
                        id="post-description"
                        maxLength={500}
                        onChange={(event) => updateField("description", event.target.value)}
                        required
                        value={form.description}
                      />
                    </div>
                    <div>
                      <div className="mb-1.5 flex items-center justify-between gap-3">
                        <label className="text-sm font-semibold text-slate-300" htmlFor="post-content">
                          Markdown 正文 <span aria-hidden="true" className="text-amber-300">*</span>
                        </label>
                        <span className="font-mono text-[0.65rem] text-slate-400">
                          {form.content.length.toLocaleString()} / 500,000
                        </span>
                      </div>
                      <div
                        aria-describedby="post-content-history-help"
                        aria-invalid={hasAttemptedSubmit && !form.content.trim()}
                        id="post-content"
                      >
                        <InlineMarkdownEditor
                          disabled={isArticleLoading || isSaving || isPublishedEditor}
                          mediaUploadUrl={domain === "research" ? "/api/admin/research-media" : "/api/admin/media"}
                          onChange={handleInlineMarkdownChange}
                          onComposingChange={handleMarkdownComposingChange}
                          onError={setError}
                          onStatus={setMessage}
                          previewUrl={domain === "research" ? "/api/admin/research-preview-blocks" : "/api/admin/preview-blocks"}
                          slug={form.slug}
                          value={form.content}
                        />
                      </div>
                      <p className="mt-1 text-xs text-slate-400" id="post-content-history-help">
                        點選區塊編輯原始 Markdown，離開後立即排版。已發布文章停止輸入 1 秒後自動同步
                        main.md；草稿需明確儲存。圖片與 MP4 請先儲存新文章，再上傳媒體。
                      </p>
                    </div>
                  </fieldset>
                </form>
              </PixelCard>

              <PixelCard
                as="section"
                className={`studio-pane studio-preview ${workspaceTab === "preview" ? "studio-pane--active" : ""}`}
              >
                <div className="mb-4 flex items-center justify-between border-b border-[#26344d] pb-3">
                  <h2 className="font-mono text-sm font-black uppercase tracking-[0.12em] text-slate-100">
                    即時預覽
                  </h2>
                  <div className="flex items-center gap-2">
                    {isPreviewLoading ? (
                      <LoaderCircle
                        aria-label="正在更新即時預覽"
                        className="h-3.5 w-3.5 animate-spin text-cyan-200"
                      />
                    ) : null}
                    <span className="font-mono text-[0.65rem] text-emerald-300/70">
                      LIVE / REHYPE POLICY ACTIVE
                    </span>
                  </div>
                </div>
                {previewHtml ? (
                  <article
                    className="prose-content pixel-scrollbar max-h-[56rem] overflow-y-auto pr-2"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                ) : isPreviewLoading ? (
                  <div className="flex min-h-[24rem] items-center justify-center gap-2 text-sm text-slate-400" role="status">
                    <LoaderCircle aria-hidden="true" className="h-5 w-5 animate-spin" />
                    正在安全轉換 Markdown…
                  </div>
                ) : (
                  <div className="flex min-h-[24rem] flex-col items-center justify-center border border-dashed border-[#26344d] px-6 text-center">
                    <Eye aria-hidden="true" className="mb-3 h-7 w-7 text-slate-400" />
                    <p className="font-mono text-sm font-bold text-slate-400">尚未產生安全預覽</p>
                    <p className="mt-2 max-w-sm text-xs leading-5 text-slate-400">
                      輸入 slug 與 Markdown 並停止 1 秒後，預覽會依公開頁面的格式
                      自動更新預覽。
                    </p>
                  </div>
                )}
              </PixelCard>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
