import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin/admin-console";
import { getServerAdminSession } from "@/lib/admin/server-session";

export const metadata: Metadata = {
  description: "研究文章、排序與實驗紀錄管理工作區。",
  robots: { follow: false, index: false },
  title: "Research Content Studio",
};
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ResearchAdminPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const session = await getServerAdminSession();
  if (!session) redirect("/admin/login");
  return <AdminConsole domain="research" initialSlug={(await searchParams).slug} initialSession={{
    expiresAt: session.expiresAt.toISOString(),
    user: session.user,
  }} />;
}
