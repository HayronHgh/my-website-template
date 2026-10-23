"use client";

import { Fragment, useEffect, useLayoutEffect, useRef, useState, type DragEvent } from "react";
import { ArrowDown, ArrowUp, GitBranchPlus, GripVertical, Plus, Trash2, Undo2, Redo2 } from "lucide-react";
import { adminRequest } from "@/components/admin/admin-api";
import { MarkdownMediaToolbar, type MarkdownMediaHandle } from "@/components/admin/markdown-media-toolbar";
import { MarkdownChartToolbar } from "@/components/admin/markdown-chart-toolbar";
import { canHandleBlockKey, insertBlock, mergeBlock, moveBlock, readDocument, removeBlock, splitBlock, usesLiteralEnter, writeDocument, type EditorDocument } from "@/lib/admin/block-editor-model";
import { matchBlockCommands, mermaidSnippet, slashQuery, type BlockCommand } from "@/lib/admin/block-commands";

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
  const [menu, setMenu] = useState<{ id: string; query: string; selected: number } | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropGap, setDropGap] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const menuElement = useRef<HTMLDivElement>(null);
  const mediaControls = useRef<MarkdownMediaHandle>(null);
  const mediaTarget = useRef<{ id: string; text: string } | null>(null);
  const insertionAnchor = useRef<string | null>(null);
  const draggedId = useRef<string | null>(null);
  const dismissAfterComposition = useRef(false);
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
  const editable = useRef(!disabled);
  const errorHandler = useRef(onError);
  const compositionHandler = useRef(onComposingChange);

  useLayoutEffect(() => { errorHandler.current = onError; compositionHandler.current = onComposingChange; editable.current = !disabled; });
  useEffect(() => {
    live.current = true;
    return () => { live.current = false; compositionHandler.current?.(false); };
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      // Toolbars/dialogs must retain their insertion anchor. Everything else,
      // including whitespace within this editor, can dismiss source editing.
      const keep = target.closest(".inline-block-source-wrap, .inline-editor-toolbar, .inline-block-actions, .inline-block-gap, .inline-add-block");
      if (keep && root.current?.contains(keep)) return;
      if (composing.current) { dismissAfterComposition.current = true; return; }
      pendingFocus.current = null;
      setActive(null); setMenu(null);
    };
    window.document.addEventListener("pointerdown", outside, true);
    return () => window.document.removeEventListener("pointerdown", outside, true);
  }, []);
  useEffect(() => {
    if (value === emitted.current) return;
    const next = readDocument(value);
    emitted.current = value;
    current.current = next;
    past.current = []; future.current = [];
    selection.current = null;
    insertionAnchor.current = null; mediaTarget.current = null; draggedId.current = null;
    pendingFocus.current = null;
    setMenu(null); setDragging(null); setDropGap(null);
    setAnnouncement("");
    setDocument(next); setActive(null); setHtml({});
    refreshHistory();
  }, [value]);

  useLayoutEffect(() => {
    if (menu) menuElement.current?.querySelector<HTMLElement>("[aria-selected=true]")?.scrollIntoView({ block: "nearest" });
  }, [menu]);

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
    insertionAnchor.current = id;
    pendingFocus.current = { id, start, end };
    setActive(id);
    const block = current.current.blocks.find((item) => item.id === id);
    if (block) updateCommandMenu(id, block.text, start, end);
  }
  function refreshHistory() {
    const undo = past.current.length > 0;
    const redo = future.current.length > 0;
    setHistory((previous) => ({ version: previous.version + 1, undo, redo }));
  }
  function publish(next: EditorDocument, nextSelection?: Selection) {
    current.current = next;
    emitted.current = writeDocument(next);
    if (nextSelection) { insertionAnchor.current = nextSelection.id; pendingFocus.current = nextSelection; setActive(nextSelection.id); }
    setDocument(next);
    onChange(emitted.current);
  }
  function commit(next: EditorDocument, nextSelection?: Selection) {
    if (!live.current || !editable.current) return;
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
    setMenu(null); mediaTarget.current = null;
    publish(snapshot.document, snapshot.selection ?? undefined);
    refreshHistory();
    setAnnouncement(redo ? "已重做區塊編輯。" : "已復原區塊編輯。");
  }
  function insert(index: number, text = "") {
    if (disabled || !live.current) return;
    const next = insertBlock(current.current, index, text);
    setMenu(null);
    commit(next.document, { id: next.id, start: 0, end: 0 });
  }
  function insertSnippet(text: string) {
    const target = mediaTarget.current;
    mediaTarget.current = null;
    const block = target && current.current.blocks.find((item) => item.id === target.id);
    if (block && block.text === target.text) {
      replaceCommand(block.id, text);
      return;
    }
    const index = current.current.blocks.findIndex((block) => block.id === insertionAnchor.current);
    insert(index < 0 ? current.current.blocks.length : index + 1, text);
  }
  function dismiss() {
    pendingFocus.current = null;
    setActive(null); setMenu(null);
  }
  function updateCommandMenu(id: string, text: string, start: number, end = start) {
    const query = slashQuery(text, start, end);
    setMenu(query === null || composing.current ? null : { id, query, selected: 0 });
  }
  function replaceCommand(id: string, snippet: string, caret = snippet.length) {
    if (disabled || !live.current) return;
    setMenu(null);
    commit({ ...current.current, blocks: current.current.blocks.map((block) => block.id === id ? { ...block, text: snippet } : block) }, { id, start: caret, end: caret });
  }
  function chooseCommand(command: BlockCommand) {
    if (!menu || disabled || composing.current) return;
    const block = current.current.blocks.find((item) => item.id === menu.id);
    if (!block || slashQuery(block.text, block.text.length) !== menu.query) { setMenu(null); return; }
    if (command.media) {
      if (mediaControls.current?.open(command.media)) {
        mediaTarget.current = { id: block.id, text: block.text };
        insertionAnchor.current = block.id;
        setMenu(null);
      }
    } else replaceCommand(block.id, command.snippet ?? "", command.caret);
  }
  function finishDrag() { draggedId.current = null; setDragging(null); setDropGap(null); }
  function reorder(id: string, gap: number) {
    if (disabled || composing.current) return;
    const next = moveBlock(current.current, id, gap);
    finishDrag();
    if (next === current.current) return;
    dismiss(); commit(next);
    const position = next.blocks.findIndex((block) => block.id === id) + 1;
    setAnnouncement(`已移動區塊至第 ${position} 個位置，可復原。`);
    requestAnimationFrame(() => root.current?.querySelector<HTMLButtonElement>(`[data-block-id="${id}"] .inline-block-grip`)?.focus());
  }
  function dragOver(event: DragEvent, gap: number) {
    if (!draggedId.current || disabled) return;
    event.preventDefault(); event.dataTransfer.dropEffect = "move"; setDropGap(gap);
  }
  function drop(event: DragEvent, gap: number) {
    if (!draggedId.current || disabled) return;
    event.preventDefault(); reorder(draggedId.current, gap);
  }
  function deleteBlock(id: string) {
    if (disabled || composing.current) return;
    const index = current.current.blocks.findIndex((block) => block.id === id);
    const next = removeBlock(current.current, id);
    if (next === current.current) return;
    dismiss(); commit(next);
    if (mediaTarget.current?.id === id) mediaTarget.current = null;
    insertionAnchor.current = next.blocks[Math.min(index, next.blocks.length - 1)].id;
    setAnnouncement("已刪除區塊，可按復原還原。上傳的檔案不會被刪除。");
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-block-id="${insertionAnchor.current}"] .inline-block-preview`)?.focus());
  }
  function gap(index: number) {
    return <button aria-label={`在第 ${index + 1} 個位置插入段落`} className="inline-block-gap" data-drop-target={dropGap === index || undefined} disabled={disabled} onClick={() => insert(index)} onDragEnter={(event) => dragOver(event, index)} onDragOver={(event) => dragOver(event, index)} onDrop={(event) => drop(event, index)} type="button"><Plus size={14} /><span>{dropGap === index ? "放在這裡" : "插入段落"}</span></button>;
  }
  const commands = menu ? matchBlockCommands(menu.query) : [];

  return <div className="inline-markdown-editor" ref={root} onKeyDown={(event) => {
    if ((event.target as HTMLElement).closest(".media-dialog")) return;
    if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.nativeEvent.isComposing && !composing.current) {
      const key = event.key.toLowerCase();
      if (key === "z" || key === "y") { event.preventDefault(); travel(key === "y" || event.shiftKey); }
    }
  }}>
    <div className="inline-editor-toolbar">
      <MarkdownMediaToolbar controlRef={mediaControls} disabled={disabled} onDialogClose={() => { mediaTarget.current = null; }} onChange={onChange} onError={onError} onInsertSnippet={insertSnippet} onStatus={onStatus} slug={slug} uploadUrl={mediaUploadUrl} value={value} />
      <button disabled={disabled} onClick={() => insertSnippet(mermaidSnippet)} type="button"><GitBranchPlus size={16} />插入流程圖</button>
      <MarkdownChartToolbar disabled={disabled} onInsert={insertSnippet} />
      <button aria-label="復原" disabled={disabled || !history.undo} onClick={() => travel(false)} type="button"><Undo2 size={16} /></button>
      <button aria-label="重做" disabled={disabled || !history.redo} onClick={() => travel(true)} type="button"><Redo2 size={16} /></button>
      <span aria-live="polite">{loading ? "預覽更新中…" : `${document.blocks.length} 個區塊`}</span>
    </div>
    <p className="inline-editor-hint" id={`block-help-${slug}`}>/ 快速插入 · 拖曳把手排序（或 Alt+↑↓）· Enter 新段落 · Shift+Enter 換行 · 點空白處預覽</p>
    <p className="inline-editor-announcement" role="status" aria-live="polite">{announcement}</p>
    <div className="inline-editor-blocks">
      {document.blocks.map((block, index) => <Fragment key={block.id}>
        {gap(index)}
        <div className="inline-block-row" data-block-id={block.id} data-dragging={dragging === block.id || undefined}
          onDragEnter={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); dragOver(event, index + (event.clientY >= bounds.top + bounds.height / 2 ? 1 : 0)); }}
          onDragOver={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); dragOver(event, index + (event.clientY >= bounds.top + bounds.height / 2 ? 1 : 0)); }}
          onDrop={(event) => { const bounds = event.currentTarget.getBoundingClientRect(); drop(event, index + (event.clientY >= bounds.top + bounds.height / 2 ? 1 : 0)); }}>
        <div className="inline-block-actions" aria-label={`第 ${index + 1} 個區塊操作`}>
          <button aria-label={`拖曳第 ${index + 1} 個區塊排序`} title="拖曳排序，或按 Alt+↑ / Alt+↓" className="inline-block-grip" disabled={disabled} draggable={!disabled}
            onDragStart={(event) => {
              if (disabled || composing.current) { event.preventDefault(); return; }
              draggedId.current = block.id; setDragging(block.id); setMenu(null);
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("application/x-markdown-block", block.id);
              event.dataTransfer.setData("text/plain", block.id);
            }} onDragEnd={finishDrag}
            onKeyDown={(event) => {
              if (!disabled && event.altKey && !event.ctrlKey && !event.metaKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
                event.preventDefault(); reorder(block.id, event.key === "ArrowUp" ? index - 1 : index + 2);
              }
            }} type="button"><GripVertical size={16} /></button>
          <button aria-label={`將第 ${index + 1} 個區塊上移`} disabled={disabled || index === 0} onClick={() => reorder(block.id, index - 1)} type="button"><ArrowUp size={15} /></button>
          <button aria-label={`將第 ${index + 1} 個區塊下移`} disabled={disabled || index === document.blocks.length - 1} onClick={() => reorder(block.id, index + 2)} type="button"><ArrowDown size={15} /></button>
          <button aria-label={`刪除第 ${index + 1} 個區塊`} title="刪除區塊（可復原；不會刪除上傳檔案）" className="inline-block-delete" disabled={disabled} onClick={() => deleteBlock(block.id)} type="button"><Trash2 size={15} /></button>
        </div>
        <div className="inline-block-content">
        {active === block.id ? <div className="inline-block-source-wrap"><textarea
          aria-describedby={`block-help-${slug}`} aria-label={`Markdown 區塊 ${index + 1}`}
          aria-autocomplete="list" aria-haspopup="listbox"
          aria-controls={menu?.id === block.id ? `block-menu-${block.id}` : undefined}
          aria-activedescendant={menu?.id === block.id && commands[menu.selected] ? `command-${block.id}-${commands[menu.selected].id}` : undefined}
          className="inline-block-source" disabled={disabled} ref={textarea}
          rows={Math.max(3, block.text.split("\n").length + 1)} spellCheck value={block.text}
          placeholder="開始寫作，或輸入 / 插入圖表、圖片與程式碼"
          onBlur={() => setMenu(null)}
          onSelect={(event) => {
            selection.current = { id: block.id, start: event.currentTarget.selectionStart, end: event.currentTarget.selectionEnd };
            if (slashQuery(event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget.selectionEnd) === null) setMenu(null);
          }}
          onChange={(event) => {
            const text = event.target.value;
            const caret = { id: block.id, start: event.target.selectionStart, end: event.target.selectionEnd };
            commit({ ...current.current, blocks: current.current.blocks.map((item) => item.id === block.id ? { ...item, text } : item) });
            selection.current = caret;
            updateCommandMenu(block.id, text, caret.start, caret.end);
          }}
          onCompositionStart={() => { composing.current = true; compositionRecorded.current = false; setMenu(null); onComposingChange?.(true); }}
          onCompositionEnd={(event) => {
            composing.current = false; onComposingChange?.(false);
            updateCommandMenu(block.id, event.currentTarget.value, event.currentTarget.selectionStart, event.currentTarget.selectionEnd);
            if (dismissAfterComposition.current) { dismissAfterComposition.current = false; requestAnimationFrame(dismiss); }
          }}
          onKeyDown={(event) => {
            if (!canHandleBlockKey({ isComposing: event.nativeEvent.isComposing, keyCode: event.keyCode, ctrlKey: event.ctrlKey, metaKey: event.metaKey, altKey: event.altKey }, composing.current)) return;
            const { selectionStart: start, selectionEnd: end } = event.currentTarget;
            selection.current = { id: block.id, start, end };
            if (menu?.id === block.id) {
              if (event.key === "Escape") { event.preventDefault(); setMenu(null); return; }
              if (commands.length && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
                event.preventDefault();
                setMenu({ ...menu, selected: (menu.selected + (event.key === "ArrowDown" ? 1 : -1) + commands.length) % commands.length });
                return;
              }
              if (commands.length && !event.shiftKey && (event.key === "Enter" || event.key === "Tab")) {
                event.preventDefault(); chooseCommand(commands[menu.selected] ?? commands[0]); return;
              }
              if (event.key === "Enter") setMenu(null);
            }
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
            } else if (event.key === "Escape") { event.preventDefault(); dismiss(); }
          }}
        />{menu?.id === block.id ? <div className="inline-block-command-panel">
          <div className="inline-block-command-heading"><span>快速插入</span><small>↑↓ 選擇 · Enter 插入 · Esc 取消</small></div>
          <div aria-label="快速插入區塊" className="inline-block-command-list" id={`block-menu-${block.id}`} ref={menuElement} role="listbox">
            {commands.map((command, commandIndex) => <button aria-selected={menu.selected === commandIndex} className="inline-block-command-option" id={`command-${block.id}-${command.id}`} key={command.id}
              onPointerDown={(event) => event.preventDefault()} onMouseDown={(event) => event.preventDefault()} onClick={() => chooseCommand(command)} role="option" tabIndex={-1} type="button"><span>{command.label}</span><small>{command.description}</small></button>)}
          </div>
          {!commands.length ? <p className="inline-block-command-empty">找不到符合的項目；按 Esc 保留原文字。</p> : null}
        </div> : null}</div> : <div aria-disabled={disabled} aria-label={`編輯 Markdown 區塊 ${index + 1}`} className="inline-block-preview" role="button" tabIndex={disabled ? -1 : 0}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("summary, a, button, input, video, iframe")) return;
            if (!disabled) focus(block.id, block.text.length);
          }}
          onKeyDown={(event) => {
            if (event.target === event.currentTarget && !disabled && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); focus(block.id, block.text.length); }
          }}>
          {html[block.id]?.text === block.text && html[block.id]?.html ? <div className="prose-content" dangerouslySetInnerHTML={{ __html: html[block.id].html }} /> : <span className="inline-block-fallback">{block.text || "空白段落，點一下開始寫作"}</span>}
        </div>}
        </div>
        </div>
      </Fragment>)}
    </div>
    <button className="inline-add-block" data-drop-target={dropGap === document.blocks.length || undefined} disabled={disabled} onClick={() => insert(document.blocks.length)} onDragEnter={(event) => dragOver(event, document.blocks.length)} onDragOver={(event) => dragOver(event, document.blocks.length)} onDrop={(event) => drop(event, document.blocks.length)} type="button"><Plus size={16} />{dropGap === document.blocks.length ? "放到文章最後" : "點這裡繼續寫作"}</button>
  </div>;
}
