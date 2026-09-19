"use client";
import { useRef, useState, type RefObject } from "react";
import { ImagePlus, Video, X } from "lucide-react";
import { adminRequest } from "@/components/admin/admin-api";

type MediaKind = "image" | "youtube" | "video";
type AssetResult = { assetPath: string; mimeType: string; size: number };
type Props = {
  disabled?: boolean;
  onChange: (value: string) => void;
  onError: (message: string) => void;
  onInsertSnippet?: (snippet: string) => void;
  onStatus: (message: string) => void;
  slug: string;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  uploadUrl?: string;
  value: string;
};

const withMediaSizing = (source: string, width: number, ratioWidth: number, ratioHeight: number) => {
  const url = new URL(source, "https://editor.local");
  url.searchParams.set("mediaWidth", String(width));
  url.searchParams.set("mediaAspect", `${ratioWidth}-${ratioHeight}`);
  return /^https?:\/\//i.test(source) ? url.toString() : `${url.pathname.replace(/^\//, "")}${url.search}${url.hash}`;
};

export function MarkdownMediaToolbar({ disabled, onChange, onError, onInsertSnippet, onStatus, slug, textareaRef, uploadUrl, value }: Props) {
  const [kind, setKind] = useState<MediaKind | null>(null); const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState(""); const [alt, setAlt] = useState(""); const [width, setWidth] = useState(720);
  const [ratio, setRatio] = useState<[number, number]>([16, 9]); const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(""); const drag = useRef<{ startX: number; width: number } | null>(null);
  const previewUrl = useRef("");
  const close = () => { if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); previewUrl.current = ""; setPreview(""); setKind(null); setFile(null); setUrl(""); setAlt(""); setWidth(720); setRatio([16, 9]); };
  const chooseFile = (next: File | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current); previewUrl.current = next ? URL.createObjectURL(next) : ""; setPreview(previewUrl.current);
    setFile(next); if (!next || !next.type.startsWith("image/")) { setRatio([16, 9]); return; }
    const image = new Image(); image.onload = () => { if (image.naturalWidth && image.naturalHeight) setRatio([image.naturalWidth, image.naturalHeight]); }; image.src = previewUrl.current;
  };
  const insert = (snippet: string) => {
    if (onInsertSnippet) { onInsertSnippet(snippet); return; }
    const textarea = textareaRef?.current; const start = textarea?.selectionStart ?? value.length; const end = textarea?.selectionEnd ?? start;
    const prefix = start > 0 && value[start - 1] !== "\n" ? "\n\n" : ""; const suffix = end < value.length && value[end] !== "\n" ? "\n\n" : "\n";
    const next = `${value.slice(0, start)}${prefix}${snippet}${suffix}${value.slice(end)}`; onChange(next);
    requestAnimationFrame(() => { textarea?.focus(); const caret = start + prefix.length + snippet.length + suffix.length; textarea?.setSelectionRange(caret, caret); });
  };
  async function confirm() {
    if (!kind || busy) return; setBusy(true); onError("");
    try {
      if (kind === "youtube") {
        const parsed = new URL(url); if (!/(?:youtube\.com|youtu\.be)$/i.test(parsed.hostname.replace(/^www\./, ""))) throw new Error("請輸入有效的 YouTube 網址。");
        insert(withMediaSizing(url, width, 16, 9));
      } else {
        if (!file) throw new Error("請先選擇檔案。");
        const form = new FormData(); form.set("file", file); form.set("purpose", "media"); form.set("slug", slug);
        const result = await adminRequest<AssetResult>(uploadUrl ?? `/api/admin/projects/${encodeURIComponent(slug)}/assets`, { method: "POST", body: form });
        const source = withMediaSizing(result.assetPath, width, ratio[0], ratio[1]);
        insert(kind === "image" ? `![${alt.trim() || "專案圖片"}](${result.assetPath} "media;width=${width};aspect=${ratio[0]}:${ratio[1]}")` : `[Video](${source})`);
      }
      onStatus("媒體已插入，儲存後公開頁才會更新。"); close();
    } catch (cause) { onError(cause instanceof Error ? cause.message : "媒體插入失敗。"); } finally { setBusy(false); }
  }
  const options: Array<[MediaKind, string, typeof ImagePlus]> = [["image", "插入圖片", ImagePlus], ["youtube", "YouTube", Video], ["video", "MP4", Video]];
  return <div className="markdown-media-tools">
    <div className="markdown-media-actions">{options.map(([value, label, Icon]) => <button disabled={disabled} key={value} onClick={() => { setKind(value); setRatio([16, 9]); setFile(null); }} type="button"><Icon className="h-4 w-4" />{label}</button>)}</div>
    {kind ? <div aria-modal="true" className="media-dialog" role="dialog" aria-label="插入媒體">
      <div className="media-dialog-header"><div><strong>{options.find(([value]) => value === kind)?.[1]}</strong><p>拖曳預覽右下角，會固定比例調整公開頁寬度。</p></div><button aria-label="關閉" onClick={close} type="button"><X className="h-4 w-4" /></button></div>
      {kind === "youtube" ? <label>YouTube 網址<input type="url" placeholder="https://www.youtube.com/watch?v=..." value={url} onChange={(event) => setUrl(event.target.value)} /></label> : <>
        <label>{kind === "image" ? "圖片檔案" : "MP4 檔案"}<input accept={kind === "image" ? "image/jpeg,image/png,image/webp,image/gif,image/avif" : "video/mp4"} onChange={(event) => chooseFile(event.target.files?.[0] ?? null)} type="file" /></label>
        {kind === "image" ? <label>替代文字<input value={alt} onChange={(event) => setAlt(event.target.value)} placeholder="描述圖片內容" /></label> : null}
      </>}
      <div className="media-size-row"><span>寬度 {width}px</span><span>比例 {ratio[0]}:{ratio[1]}</span></div>
      <div className="media-resize-stage">
        <div className="media-resize-preview" style={{ aspectRatio: `${ratio[0]} / ${ratio[1]}`, width: `${width}px` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {kind === "image" && preview ? <img alt="上傳預覽" src={preview} /> : kind === "video" && preview ? <video muted src={preview} /> : <span>{kind === "youtube" ? "YouTube 16:9" : kind === "video" ? "MP4 16:9" : "圖片預覽"}</span>}
          <button aria-label="固定比例縮放" className="media-resize-handle" onPointerDown={(event) => { drag.current = { startX: event.clientX, width }; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (drag.current) setWidth(Math.max(240, Math.min(1200, Math.round((drag.current.width + event.clientX - drag.current.startX) / 8) * 8))); }} onPointerUp={(event) => { drag.current = null; event.currentTarget.releasePointerCapture(event.pointerId); }} type="button" />
        </div>
      </div>
      <div className="media-dialog-footer"><button onClick={close} type="button">取消</button><button disabled={busy || (kind === "youtube" ? !url.trim() : !file)} onClick={() => void confirm()} type="button">{busy ? "上傳中…" : "插入 Markdown"}</button></div>
    </div> : null}
  </div>;
}
