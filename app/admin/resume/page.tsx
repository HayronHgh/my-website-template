import { redirect } from "next/navigation";
import { getServerAdminSession } from "@/lib/admin/server-session";
import { readDocument } from "@/lib/admin/documents";
import { DocumentEditor } from "@/components/admin/document-editor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function ResumeWorkspace() {
  const session = await getServerAdminSession();
  if (!session) redirect("/admin/login");
  const record = await readDocument("resume/resume.json");
  return <div className="workspace-main"><p className="content-caption">PROFILE / RESUME</p><h1>Resume</h1><p className="content-summary">整理經歷與能力，明確指定要呈現的專案。</p><DocumentEditor initial={record} canEdit={session.user.role === "admin"} /></div>;
}
