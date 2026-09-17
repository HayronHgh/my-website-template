import Link from "next/link";
import { articleStore } from "@/lib/admin/articles/store";
import { problemStore } from "@/lib/leetcode/store";
export async function AdminOverview({ name }: { name: string }) {
  const [articles, problems] = await Promise.all([articleStore.list(), problemStore.list()]);
  const recent = [...articles.map((a) => ({ ...a, domain: "articles" })), ...problems.map((a) => ({ ...a, domain: "leetcode" }))].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0,8);
  const drafts = [...articles, ...problems].filter((a) => !a.published).length;
  return <div className="workspace-main"><p className="content-caption">YOUR PUBLISHING DESK</p><h1>你好，{name}</h1><p className="content-summary">繼續寫作、整理解題紀錄，或更新你的作品與履歷。</p>
    <div className="workspace-actions"><Link href="/admin/articles">＋ 撰寫文章</Link><Link href="/admin/leetcode">＋ 記錄題解</Link><Link href="/admin/projects">管理專案 →</Link><Link href="/admin/resume">整理履歷 →</Link></div>
    <div className="workspace-columns"><section className="content-panel"><h2>最近編輯</h2>{recent.length ? recent.map((a) => <Link key={a.domain+a.slug} className="workspace-record" href={`/admin/${a.domain}?slug=${encodeURIComponent(a.slug)}`}><div><strong>{a.title}</strong><p>{a.domain === "articles" ? "Articles" : "LeetCode"} · {a.updatedAt.slice(0,10)}</p></div><span>{a.published ? "已發布" : "草稿"}</span></Link>) : <p className="content-empty">還沒有內容，從第一篇文章開始。</p>}</section>
    <aside className="content-panel"><h2>待處理</h2><p className="content-summary">{drafts} 篇草稿等待整理</p><h2>內容分工</h2><dl className="domain-definitions"><dt>Articles</dt><dd>研究觀點、技術文章、設計決策。</dd><dt>LeetCode</dt><dd>題號、難度、解法與複習進度。</dd><dt>Projects</dt><dd>作品成果、負責範圍與展示連結。</dd><dt>Resume</dt><dd>經歷、學歷與求職摘要。</dd></dl></aside></div>
  </div>;
}
