"use client";
import { useEffect, useState } from "react";
import { adminRequest, AdminClientError } from "@/components/admin/admin-api";
import { InlineMarkdownEditor } from "@/components/admin/inline-markdown-editor";
import type { ProjectItem } from "@/data/site";
import type { ResumeData } from "@/lib/resume/schema";
type RecordData = { key: string; revision: string; data: ProjectItem | ResumeData | string };
const lines = (value: string) => value.split("\n");
function normalizeLists(value: unknown): unknown {
  if (Array.isArray(value)) return value.every((item) => typeof item === "string")
    ? value.map((item: string) => item.trim()).filter(Boolean)
    : value.map(normalizeLists);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeLists(item)]));
  return value;
}

export function DocumentEditor({ initial, canEdit }: { initial: RecordData; canEdit: boolean }) {
  const [record, setRecord] = useState(initial);
  const [data, setData] = useState(initial.data);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const dirty = JSON.stringify(data) !== JSON.stringify(record.data);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save() {
    if (busy || !canEdit || conflict || !dirty) return;
    if (!window.confirm("儲存後會更新公開網站，確定套用這些變更？")) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await adminRequest<RecordData>("/api/admin/documents", { method: "PUT", body: JSON.stringify({ key: record.key, revision: record.revision, data: normalizeLists(data) }) });
      setRecord(result); setData(result.data); setMessage("已儲存");
    } catch (e) {
      setError(e instanceof Error ? e.message : "儲存失敗");
      setConflict(e instanceof AdminClientError && e.status === 409);
    } finally { setBusy(false); }
  }
  const project = !record.key.startsWith("resume/") && typeof data !== "string" ? data as ProjectItem : null;
  const projectSlug = record.key.startsWith("projects/") ? record.key.split("/")[1] : "";
  const resume = record.key.startsWith("resume/") ? data as ResumeData : null;
  const patchProject = (key: string, value: unknown) => setData({ ...project!, [key]: value });
  const patchResume = (key: string, value: unknown) => setData({ ...resume!, [key]: value });
  async function uploadCover(file: File | undefined) {
    if (!file || !project || !projectSlug) return;
    setBusy(true); setError(""); setMessage("封面上傳中…");
    try {
      const body = new FormData(); body.set("file", file); body.set("purpose", "cover");
      const result = await adminRequest<{ assetPath: string }>(`/api/admin/projects/${encodeURIComponent(projectSlug)}/assets`, { method: "POST", body });
      patchProject("cover", result.assetPath); setMessage("封面已上傳，請儲存變更以套用。");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "封面上傳失敗。"); setMessage(""); } finally { setBusy(false); }
  }
  return <div className="content-panel document-editor">
    <div className="document-toolbar"><span role="status">{busy ? "儲存中…" : dirty ? "尚未儲存" : message || "已同步"}</span><button onClick={() => void save()} disabled={busy || !dirty || !canEdit || conflict}>儲存變更</button></div>
    {!canEdit && <p>目前帳號可檢視；專案與履歷由管理員編輯。</p>}
    {error && <div role="alert" className="workspace-error"><p>{error}</p>{conflict && <><p>請先複製本機內容，再重新載入並合併。</p><button onClick={async () => { try { await navigator.clipboard.writeText(typeof data === "string" ? data : JSON.stringify(data, null, 2)); setMessage("本機內容已複製"); } catch { setError("無法存取剪貼簿，請手動複製內容。"); } }}>複製本機內容</button><button onClick={async () => {
      if (!window.confirm("重新載入會放棄本機變更，確定已保留內容？")) return;
      setBusy(true);
      try { const next = await adminRequest<RecordData>(`/api/admin/documents?key=${encodeURIComponent(record.key)}`); setRecord(next); setData(next.data); setConflict(false); setError(""); }
      catch (e) { setError((e as Error).message); } finally { setBusy(false); }
    }}>重新載入</button></>}</div>}
    <fieldset disabled={busy || !canEdit}>
    {typeof data === "string" && <InlineMarkdownEditor disabled={busy || !canEdit} onChange={setData} onError={setError} onStatus={setMessage} previewUrl={`/api/admin/projects/${encodeURIComponent(projectSlug)}/preview`} slug={projectSlug} value={data} />}
    {project && <div className="document-fields">
      {([["title","專案名稱"],["category","分類"],["summary","摘要"],["description","說明"],["scope","負責範圍"],["year","年份"],["publicBoundary","公開範圍"]] as const).map(([key,label]) =>
        <label key={key}>{label}<textarea rows={key === "description" ? 4 : 2} value={project[key] ?? ""} onChange={(e) => patchProject(key, e.target.value || undefined)} /></label>)}
      <label>發布狀態<select value={String(project.published !== false)} onChange={(e) => patchProject("published", e.target.value === "true")}><option value="false">草稿</option><option value="true">公開</option></select></label>
      <label>展示分組<select value={project.group ?? "featured"} onChange={(e) => patchProject("group", e.target.value)}>{["featured","systems","experiments"].map((v) => <option key={v}>{v}</option>)}</select></label>
      <section className="project-cover-field"><div><h2>專案封面</h2><p>建議 16:9、至少 1280 × 720。支援 JPG、PNG、WebP、GIF、AVIF，最大 12MB。</p></div><input accept="image/jpeg,image/png,image/webp,image/gif,image/avif" onChange={(event) => void uploadCover(event.target.files?.[0])} type="file" /><label>封面路徑<input value={project.cover} onChange={(event) => patchProject("cover", event.target.value)} /></label><label>圖片焦點<input value={project.coverPosition} onChange={(event) => patchProject("coverPosition", event.target.value)} /><small>CSS object-position，例如 center center 或 50% 30%。</small></label></section>
      {(["tech","outcomes","relatedTags"] as const).map((key) => <label key={key}>{{tech:"技術",outcomes:"成果",relatedTags:"相關文章標籤"}[key]} · 每行一項<textarea value={(project[key] ?? []).join("\n")} onChange={(e) => patchProject(key, lines(e.target.value))} /></label>)}
      {(["repoUrl","demoUrl","caseStudyUrl"] as const).map((key) => <label key={key}>{{repoUrl:"原始碼連結",demoUrl:"展示連結",caseStudyUrl:"案例文章連結"}[key]}<input value={project[key] ?? ""} onChange={(e) => patchProject(key, e.target.value || undefined)} /></label>)}
    </div>}
    {resume && <div className="document-fields">
      <label>履歷摘要<textarea rows={4} value={resume.resumeSummary} onChange={(e) => patchResume("resumeSummary", e.target.value)} /></label>
      <label>精選專案 slug · 每行一項<textarea value={resume.projectSlugs.join("\n")} onChange={(e) => patchResume("projectSlugs", lines(e.target.value))} /><small>只引用指定的公開專案，留白代表不展示專案。</small></label>
      {resume.resumeExperience.map((item,index) => <section className="document-entry" key={index}><h2>經歷 {index+1}</h2>
        {(["title","organization","period","description"] as const).map((key) => <label key={key}>{{title:"職稱",organization:"組織",period:"期間",description:"說明"}[key]}<textarea value={item[key]} onChange={(e) => patchResume("resumeExperience", resume.resumeExperience.map((v,i) => i === index ? { ...v, [key]: e.target.value } : v))} /></label>)}
        <label>重點成果 · 每行一項<textarea value={item.highlights.join("\n")} onChange={(e) => patchResume("resumeExperience", resume.resumeExperience.map((v,i) => i === index ? { ...v, highlights: lines(e.target.value) } : v))} /></label>
        <button onClick={() => { if (window.confirm("移除此經歷？儲存後才會套用。")) patchResume("resumeExperience", resume.resumeExperience.filter((_,i) => i !== index)); }}>移除經歷</button>
      </section>)}
      <button onClick={() => patchResume("resumeExperience", [...resume.resumeExperience, { title:"", organization:"", period:"", description:"", highlights:[] }])}>＋ 新增經歷</button>
      {resume.resumeSections.map((item,index) => <section className="document-entry" key={index}><label>段落名稱<input value={item.title} onChange={(e) => patchResume("resumeSections", resume.resumeSections.map((v,i) => i === index ? { ...v, title:e.target.value } : v))} /></label><label>內容 · 每行一項<textarea value={item.items.join("\n")} onChange={(e) => patchResume("resumeSections", resume.resumeSections.map((v,i) => i === index ? { ...v, items:lines(e.target.value) } : v))} /></label>
      <button onClick={() => { if(window.confirm("移除此段落？儲存後才會套用。")) patchResume("resumeSections", resume.resumeSections.filter((_,i) => i !== index)); }}>移除段落</button></section>)}
      <button onClick={() => patchResume("resumeSections", [...resume.resumeSections, { title:"", items:[] }])}>＋ 新增段落</button>
      <p className="content-caption">網頁履歷與下載的 PDF 是獨立資產；發布履歷後也請更新 PDF。</p>
    </div>}
    </fieldset>
  </div>;
}
