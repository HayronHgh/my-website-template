"use client";
/* Native navigation intentionally triggers the editors' beforeunload guard. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { usePathname } from "next/navigation";
const entries = [["/admin","總覽","cyan"],["/admin/home","首頁","purple"],["/admin/articles","文章","purple"],["/admin/research","研究","green"],["/admin/leetcode","LeetCode","amber"],["/admin/projects","專案","blue"],["/admin/resume","履歷","pink"]];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/login")) return children;
  const accent = entries.find(([href]) => href !== "/admin" && pathname.startsWith(href))?.[2] ?? "cyan";
  return <div className="admin-shell" data-glow={accent}><nav className="workspace-nav" aria-label="後台工作區">
    <a href="/admin" className="workspace-brand">▦ Content Studio</a>
    <div>{entries.map(([href,label,color]) => <a key={href} href={href} data-glow={color} aria-current={(href === "/admin" ? pathname === href : pathname.startsWith(href)) ? "page" : undefined}>{label}</a>)}</div>
    <a href="/" className="workspace-visit">查看網站 ↗</a>
  </nav>{children}</div>;
}
