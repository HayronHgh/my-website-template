import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminConsole } from "@/components/admin/admin-console";
import { WritingWorkspace } from "@/components/admin/writing-workspace";
import { getServerAdminSession } from "@/lib/admin/server-session";

export const metadata: Metadata = {
  description: "受保護的 Markdown 文章編輯、預覽與發布控制台。",
  robots: { follow: false, index: false },
  title: "Editorial Operations Console",
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ slug?: string; legacy?: string }> }) {
  const session = await getServerAdminSession();

  if (!session) {
    redirect("/admin/login");
  }

  const Editor = (await searchParams).legacy === "1" ? AdminConsole : WritingWorkspace;
  return (
    <Editor
      domain="leetcode"
      initialSlug={(await searchParams).slug}
      initialSession={{
        expiresAt: session.expiresAt.toISOString(),
        user: session.user,
      }}
    />
  );
}
