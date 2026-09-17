import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminOverview } from "@/components/admin/overview";
import { getServerAdminSession } from "@/lib/admin/server-session";

export const metadata: Metadata = {
  description: "受保護的 Markdown 文章編輯、預覽與發布控制台。",
  robots: { follow: false, index: false },
  title: "Editorial Operations Console",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage() {
  const session = await getServerAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  return <AdminOverview name={session.user.displayName} />;
}
