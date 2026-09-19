"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderPlus } from "lucide-react";
import { adminRequest } from "@/components/admin/admin-api";

const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function ProjectCreateForm({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false); const [title, setTitle] = useState(""); const [slug, setSlug] = useState("");
  const [slugWasEdited, setSlugWasEdited] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  if (!canCreate) return null;
  async function create() {
    if (!title.trim() || !slug.trim() || busy) return;
    setBusy(true); setError("");
    try {
      const result = await adminRequest<{ slug: string }>("/api/admin/projects", { method: "POST", body: JSON.stringify({ slug, title }) });
      router.push(`/admin/projects?slug=${encodeURIComponent(result.slug)}`); router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "建立專案失敗"); setBusy(false); }
  }
  return <div className="project-create">
    <button aria-expanded={open} onClick={() => setOpen((value) => !value)} type="button"><FolderPlus className="h-4 w-4" />新增專案</button>
    {open ? <div className="project-create-fields">
      <label>專案名稱<input value={title} onChange={(event) => { setTitle(event.target.value); if (!slugWasEdited) setSlug(slugify(event.target.value)); }} /></label>
      <label>slug<input pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={slug} onChange={(event) => { setSlugWasEdited(true); setSlug(slugify(event.target.value)); }} /><small>建立後不可變更，例如 quant-research。</small></label>
      {error ? <p role="alert" className="workspace-error">{error}</p> : null}
      <button disabled={busy || !title.trim() || !slug.trim()} onClick={() => void create()} type="button">{busy ? "建立中…" : "建立草稿"}</button>
    </div> : null}
  </div>;
}
