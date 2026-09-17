import { redirect } from "next/navigation";
import { getServerAdminSession } from "@/lib/admin/server-session";
import { getAllProjects } from "@/lib/projects/meta";
import { readDocument } from "@/lib/admin/documents";
import { DocumentEditor } from "@/components/admin/document-editor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function ProjectsWorkspace({ searchParams }: { searchParams: Promise<{ slug?: string; view?: string }> }) {
  const session = await getServerAdminSession();
  if (!session) redirect("/admin/login");
  const projects = await getAllProjects();
  const query = await searchParams;
  const selected = projects.find((p) => p.slug === query.slug);
  const view = query.view === "detail" ? "main.md" : "meta.json";
  const record = selected ? await readDocument(`projects/${selected.slug}/${view}`) : null;
  return <div className="workspace-main"><p className="content-caption">PORTFOLIO / CASE STUDIES</p><h1>Projects</h1><p className="content-summary">作品卡片呈現成果與範圍；專案說明記錄架構與取捨。</p>
    <div className="workspace-columns project-workspace-columns"><section className="content-panel"><h2>選取專案</h2>{projects.map((p) => <a className="workspace-record" href={`/admin/projects?slug=${p.slug}`} key={p.slug}><strong>{p.title}</strong><span>{p.published === false ? "草稿" : "公開"}</span></a>)}</section>
    {record && selected ? <section><nav className="workspace-actions"><a href={`/admin/projects?slug=${selected.slug}`}>作品卡片</a><a href={`/admin/projects?slug=${selected.slug}&view=detail`}>專案說明</a><a href={`/projects/${selected.slug}`} target="_blank" rel="noreferrer">查看公開頁 ↗</a></nav><DocumentEditor key={record.key} initial={record} canEdit={session.user.role === "admin"} /></section> : <div className="content-empty">選取左側專案，開始編輯。</div>}</div>
  </div>;
}
