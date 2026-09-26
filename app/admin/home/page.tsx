import { redirect } from "next/navigation";
import { getServerAdminSession } from "@/lib/admin/server-session";
import { readDocument } from "@/lib/admin/documents";
import { DocumentEditor } from "@/components/admin/document-editor";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function HomeWorkspace() {
  const session = await getServerAdminSession();
  if (!session) redirect("/admin/login");
  const record = await readDocument("site/focus.json");
  return <div className="workspace-main"><h1>首頁 Focus</h1><p className="content-summary">第一個啟用項目為主要投入，其餘依順序展示。儲存後更新首頁。</p><DocumentEditor initial={record} canEdit={session.user.role === "admin"} /></div>;
}
