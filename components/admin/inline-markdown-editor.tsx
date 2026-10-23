"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState } from "react";
import { GitBranchPlus, Plus, Undo2, Redo2 } from "lucide-react";
import { adminRequest } from "@/components/admin/admin-api";
import { MarkdownMediaToolbar } from "@/components/admin/markdown-media-toolbar";
import { MarkdownChartToolbar } from "@/components/admin/markdown-chart-toolbar";
import { canHandleBlockKey, insertBlock, mergeBlock, readDocument, splitBlock, usesLiteralEnter, writeDocument, type EditorDocument } from "@/lib/admin/block-editor-model";

type Props = { disabled?: boolean; mediaUploadUrl?: string; onChange: (value: string) => void; onComposingChange?: (value: boolean) => void; onError: (value: string) => void; onStatus: (value: string) => void; previewUrl: string; slug: string; value: string };
type Selection = { id: string; start: number; end: number };
type Snapshot = { document: EditorDocument; selection: Selection | null };

export function InlineMarkdownEditor(props: Props) {
  return <BlockEditor key={props.slug} {...props} />;
}

function BlockEditor({ disabled, mediaUploadUrl, onChange, onComposingChange, onError, onStatus, previewUrl, slug, value }: Props) {
  const [document, setDocument] = useState(() => readDocument(value));
  const [active, setActive] = useState<string | null>(null);
  const [html, setHtml] = useState<Record<string, { text: string; html: string }>>({});
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState({ version: 0, undo: false, redo: false });
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const current = useRef(document);
  const emitted = useRef(value);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const selection = useRef<Selection | null>(null);
  const pendingFocus = useRef<Selection | null>(null);
  const composing = useRef(false);
  const compositionRecorded = useRef(false);
  const live = useRef(true);
  const errorHandler = useRef(onError);
  const compositionHandler = useRef(onComposingChange);

  useLayoutEffect(() => { errorHandler.current = onError; compositionHandler.current = onComposingChange; });
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; compositionHandler.current?.(false); };
  }, []);
  useEffect(() => {
    if (value === emitted.current) return;
    const next = readDocument(value);
    emitted.current = value;
    current.current = next;
    past.current = []; future.current = [];
    selection.current = null;
    setDocument(next); setActive(null); setHtml({});
    refreshHistory();
  }, [value]);

  useLayoutEffect(() => {
    const target = pendingFocus.current;
    if (!target || !textarea.current || active !== target.id || disabled) return;
    textarea.current.focus();
    textarea.current.setSelectionRange(target.start, target.end);
    selection.current = target;
    pendingFocus.current = null;
  }, [active, document, disabled, history.version]);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const result = await adminRequest<{ html: string[] }>(previewUrl, { method: "POST", signal: controller.signal, body: JSON.stringify({ blocks: document.blocks.map((block) => block.text), slug }) });
        if (!disposed) setHtml(Object.fromEntries(document.blocks.map((block, index) => [block.id, { text: block.text, html: result.html[index] ?? "" }])));
      } catch (cause) {
        if (!disposed) errorHandler.current(cause instanceof Error ? cause.message : "預覽載入失敗。");
      } finally { if (!disposed) setLoading(false); }
    }, 220);
    return () => { disposed = true; controller.abort(); window.clearTimeout(timer); };
  }, [document, previewUrl, slug]);

  function focus(id: string, start = 0, end = start) {
    pendingFocus.current = { id, start, end };
    setActive(id);
  }
  function refreshHistory() {
    const undo = past.current.length > 0;
    const redo = future.current.length > 0;
    setHistory((previous) => ({ version: previous.version + 1, undo, redo }));
  }
  function publish(next: EditorDocument, nextSelection?: Selection) {
    current.current = next;
    emitted.current = writeDocument(next);
    if (nextSelection) { pendingFocus.current = nextSelection; setActive(nextSelection.id); }
    setDocument(next);
    onChange(emitted.current);
  }
  function commit(next: EditorDocument, nextSelection?: Selection) {
    if (!live.current) return;
    if (!composing.current || !compositionRecorded.current) {
      past.current = [...past.current.slice(-99), { document: current.current, selection: selection.current }];
      if (composing.current) compositionRecorded.current = true;
    }
    future.current = [];
    publish(next, nextSelection);
    refreshHistory();
  }
  function travel(redo: boolean) {
    if (disabled || composing.current) return;
    const from = redo ? future : past;
    const to = redo ? past : future;
    const snapshot = from.current.pop();
    if (!snapshot) return;
    to.current.push({ document: current.current, selection: selection.current });
    if (!snapshot.selection) setActive(null);
    publish(snapshot.document, snapshot.selection ?? undefined);
    refreshHistory();
  }
  function insert(index: number, text = "") {
    if (disabled || !live.current) return;
    const next = insertBlock(current.current, index, text);
    commit(next.document, { id: next.id, start: 0, end: 0 });
  }
  function insertSnippet(text: string) {
    const index = current.current.blocks.findIndex((block) => block.id === active);
    insert(index < 0 ? current.current.blocks.length : index + 1, text);
  }
  function gap(index: number) {
    return <button aria-label={`在第 ${index + 1} 個位置插入段落`} className="inline-block-gap" disabled={disabled} onClick={() => insert(index)} type="button"><Plus size={14} /><span>插入段落</span></button>;
  }
  const mermaid = "```mermaid\nflowchart TD\n  A[開始] --> B{條件}\n  B -->|是| C[完成]\n  B -->|否| D[調整]\n  D --> B\n```";

  return <div className="inline-markdown-editor" onKeyDown={(event) => {
    if ((event.target as HTMLElement).closest(".media-dialog")) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.nativeEvent.isComposing && !composing.current) {
      const key = event.key.toLowerCase();
      if (key === "z" || key === "y") { event.preventDefault(); travel(key === "y" || event.shiftKey); }
    }
  }}>
    <div className="inline-editor-toolbar">
      <MarkdownMediaToolbar disabled={disabled} onChange={onChange} onError={onError} onInsertSnippet={insertSnippet} onStatus={onStatus} slug={slug} uploadUrl={mediaUploadUrl} value={value} />
      <button disabled={disabled} onClick={() => insertSnippet(mermaid)} type="button"><GitBranchPlus size={16} />插入流程圖</button>
      <MarkdownChartToolbar disabled={disabled} onInsert={insertSnippet} />
      <button aria-label="復原" disabled={disabled || !history.undo} onClick={() => travel(false)} type="button"><Undo2 size={16} /></button>
      <button aria-label="重做" disabled={disabled || !history.redo} onClick={() => travel(true)} type="button"><Redo2 size={16} /></button>
      <span aria-live="polite">{loading ? "預覽更新中…" : `${document.blocks.length} 個區塊`}</span>
    </div>
    <p className="inline-editor-hint" id={`block-help-${slug}`}>Enter 新增段落 · Shift+Enter 區塊內換行 · 程式碼、圖表與清單可直接換行</p>
    <div className="inline-editor-blocks">
      {document.blocks.map((block, index) => <Fragment key={block.id}>
        {gap(index)}
        {active === block.id ? <textarea
          aria-describedby={`block-help-${slug}`} aria-label={`Markdown 區塊 ${index + 1}`}
          className="inline-block-source" disabled={disabled} ref={textarea}
          rows={Math.max(3, block.text.split("\n").length + 1)} spellCheck value={block.text}
          placeholder="開始寫作…（支援 Markdown）"
          onSelect={(event) => { selection.current = { id: block.id, start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd }; }}
          onChange={(event) => {
            const text = event.target.value;
            const caret = { id: block.id, start: event.target.selectionStart, end: event.target.selectionEnd };
            commit({ ...current.current, blocks: current.current.blocks.map((item) => item.id === block.id ? { ...item, text } : item) });
            selection.current = caret;
          }}
          onCompositionStart={() => { composing.current = true; compositionRecorded.current = false; onComposingChange?.(true); }}
          onCompositionEnd={() => { composing.current = false; onComposingChange?.(false); }}
          onKeyDown={(event) => {
            if (!canHandleBlockKey({ isComposing: event.nativeEvent.isComposing, keyCode: event.keyCode, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey }, composing.current)) return;
            const { selectionStart: start, selectionEnd: end } = event.currentTarget;
            selection.current = { id: block.id, start, end };
            if (event.key === "Enter" && !event.shiftKey && !usesLiteralEnter(block.text)) {
              event.preventDefault();
              const next = splitBlock(current.current, index, start, end);
              commit(next.document, { id: next.id, start: 0, end: 0 });
            } else if (event.key === "Backspace" && start === 0 && end === 0 && index > 0) {
              const previous = current.current.blocks[index - 1];
              if (block.text && (usesLiteralEnter(previous.text) || usesLiteralEnter(block.text))) return;
              event.preventDefault();
              const next = mergeBlock(current.current, index);
              if (next) commit(next.document, { id: next.id, start: next.caret, end: next.caret });
            } else if (event.key === "Escape") { event.preventDefault(); setActive(null); }
          }}
        /> : <div aria-disabled={disabled} aria-label={`編輯 Markdown 區塊 ${index + 1}`} className="inline-block-preview" role="button" tabIndex={disabled ? -1 : 0}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("summary, a, button, input, video, iframe")) return;
            if (!disabled) focus(block.id, block.text.length);
          }}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && !disabled && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); focus(block.id, block.text.length); }
          }}>
          {html[block.id]?.text === block.text && html[block.id]?.html ? <div className="prose-content" dangerouslySetInnerHTML={{ __html: html[block.id].html }} /> : <span className="inline-block-fallback">{block.text || "空白段落，點一下開始寫作"}</span>}
        </div>}
      </Fragment>)}
    </div>
    <button className="inline-add-block" disabled={disabled} onClick={() => insert(document.blocks.length)} type="button"><Plus size={16} />點這裡繼續寫作</button>
  </div>;
}
