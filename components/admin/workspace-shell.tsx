"use client";
/* Native navigation intentionally triggers the editors' beforeunload guard. */
/* eslint-disable @next/next/no-html-link-for-pages */
import { usePathname } from "next/navigation";
const entries = [["/admin","Overview"],["/admin/articles","Articles"],["/admin/leetcode","LeetCode"],["/admin/projects","Projects"],["/admin/resume","Resume"]];
export function WorkspaceShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin/login")) return children;
  return <div className="admin-shell"><nav className="workspace-nav" aria-label="後台工作區">
    <a href="/admin" className="workspace-brand">▦ Content Studio</a>
    <div>{entries.map(([href,label]) => <a key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</a>)}</div>
    <a href="/" className="workspace-visit">查看網站 ↗</a>
  </nav>{children}</div>;
}
