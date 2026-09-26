import Link from "next/link";
import { articleStore } from "@/lib/admin/articles/store";
import { problemStore } from "@/lib/leetcode/store";
import { researchStore } from "@/lib/research/store";
export async function AdminOverview({ name }: { name: string }) {
  const [articles, problems, research] = await Promise.all([articleStore.list(), problemStore.list(), researchStore.list()]);
  const recent = [...articles.map((a) => ({ ...a, domain: "articles" as const })), ...problems.map((a) => ({ ...a, domain: "leetcode" as const })), ...research.map((a) => ({ ...a, domain: "research" as const }))].sort((a,b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0,8);
  const drafts = [...articles, ...problems, ...research].filter((a) => !a.published).length;
  const labels = { articles: "Articles", leetcode: "LeetCode", research: "Research" };
  return <div className="workspace-main"><p className="content-caption">YOUR PUBLISHING DESK</p><h1>你好，{name}</h1><p className="content-summary">繼續寫作、整理研究與解題紀錄，或更新你的作品與履歷。</p>
    <div className="workspace-actions"><Link href="/admin/articles">＋ 撰寫文章</Link><Link href="/admin/research">＋ 新增研究</Link><Link href="/admin/leetcode">＋ 記錄題解</Link><Link href="/admin/projects">管理專案 →</Link><Link href="/admin/resume">整理履歷 →</Link></div>
    <div className="workspace-columns"><section className="content-panel"><h2>最近編輯</h2>{recent.length ? recent.map((a) => <Link key={a.domain+a.slug} className="workspace-record" href={`/admin/${a.domain}?slug=${encodeURIComponent(a.slug)}`}><div><strong>{a.title}</strong><p>{labels[a.domain]} · {a.updatedAt.slice(0,10)}</p></div><span>{a.published ? "已發布" : "草稿"}</span></Link>) : <p className="content-empty">還沒有內容，從第一篇文章開始。</p>}</section>
    <aside className="content-panel"><h2>待處理</h2><p className="content-summary">{drafts} 篇草稿等待整理</p><h2>內容分工</h2><dl className="domain-definitions"><dt>Articles</dt><dd>工程觀點、技術文章、設計決策。</dd><dt>Research</dt><dd>研究問題、方法、實驗與可重現結果。</dd><dt>LeetCode</dt><dd>題號、難度、解法與複習進度。</dd><dt>Projects</dt><dd>作品成果、負責範圍與展示連結。</dd><dt>Resume</dt><dd>經歷、學歷與求職摘要。</dd></dl></aside></div>
  </div>;
}
