"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { GitBranchPlus, Plus } from "lucide-react";
import { adminRequest } from "@/components/admin/admin-api";
import { MarkdownMediaToolbar } from "@/components/admin/markdown-media-toolbar";
import { splitMarkdownBlocks } from "@/lib/admin/markdown-blocks";

type Props = { disabled?: boolean; mediaUploadUrl?: string; onChange: (value: string) => void; onComposingChange?: (value: boolean) => void; onError: (value: string) => void; onStatus: (value: string) => void; previewUrl: string; slug: string; value: string };
export function InlineMarkdownEditor({ disabled, mediaUploadUrl, onChange, onComposingChange, onError, onStatus, previewUrl, slug, value }: Props) {
  const blocks = useMemo(() => splitMarkdownBlocks(value), [value]); const [active, setActive] = useState<{ index: number; slug: string } | null>(null);
  const activeIndex = active?.slug === slug ? active.index : null;
  const [html, setHtml] = useState<string[]>([]); const [loading, setLoading] = useState(false); const textareaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    let disposed = false; const timer = window.setTimeout(async () => {
      setLoading(true);
      try { const result = await adminRequest<{ html: string[] }>(previewUrl, { method: "POST", body: JSON.stringify({ blocks, slug }) }); if (!disposed) setHtml(result.html); }
      catch (cause) { if (!disposed) onError(cause instanceof Error ? cause.message : "預覽載入失敗。"); }
      finally { if (!disposed) setLoading(false); }
    }, 220);
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [blocks, onError, previewUrl, slug]);
  const updateBlock = (index: number, content: string) => { const next = [...blocks]; next[index] = content; onChange(next.join("\n\n")); };
  const insertAfter = (snippet: string, after = activeIndex ?? blocks.length - 1) => { const next = [...blocks]; next.splice(after + 1, 0, snippet); onChange(next.join("\n\n")); setActive({ index: after + 1, slug }); requestAnimationFrame(() => textareaRef.current?.focus()); };
  const mermaid = "```mermaid\nflowchart TD\n  A[開始] --> B{條件}\n  B -->|是| C[完成]\n  B -->|否| D[調整]\n  D --> B\n```";
  return <div className="inline-markdown-editor">
    <div className="inline-editor-toolbar"><MarkdownMediaToolbar disabled={disabled} onChange={onChange} onError={onError} onInsertSnippet={(snippet) => insertAfter(snippet)} onStatus={onStatus} slug={slug} uploadUrl={mediaUploadUrl} value={value} /><button disabled={disabled} onClick={() => insertAfter(mermaid)} type="button"><GitBranchPlus className="h-4 w-4" />插入流程圖</button><span>{loading ? "預覽更新中…" : `${blocks.length} 個區塊`}</span></div>
    <div className="inline-editor-blocks">{blocks.map((block, index) => activeIndex === index ? <textarea aria-label={`Markdown 區塊 ${index + 1}`} autoFocus className="inline-block-source" disabled={disabled} key={`source-${index}`} onBlur={() => setActive(null)} onChange={(event) => updateBlock(index, event.target.value)} onCompositionEnd={() => onComposingChange?.(false)} onCompositionStart={() => onComposingChange?.(true)} ref={textareaRef} rows={Math.max(3, block.split("\n").length + 1)} spellCheck value={block} /> : <div aria-disabled={disabled} aria-label={`編輯 Markdown 區塊 ${index + 1}`} className="inline-block-preview" key={`preview-${index}`} onClick={() => { if (!disabled) setActive({ index, slug }); }} onKeyDown={(event) => { if (!disabled && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setActive({ index, slug }); } }} role="button" tabIndex={disabled ? -1 : 0}>{html[index] ? <div className="prose-content" dangerouslySetInnerHTML={{ __html: html[index] }} /> : <span>點一下開始輸入 Markdown</span>}</div>)}</div>
    <button className="inline-add-block" disabled={disabled} onClick={() => insertAfter("<!-- 新區塊 -->")} type="button"><Plus className="h-4 w-4" />新增區塊</button>
  </div>;
}
