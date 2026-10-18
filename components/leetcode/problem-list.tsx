import Link from "next/link";
import { problemStatusLabels } from "@/lib/leetcode/schema";
import { problemPageHref, type ProblemPage } from "@/lib/leetcode/problem-pagination";

export type { PublicProblem } from "@/lib/leetcode/problem-pagination";

export function ProblemList({ result }: { result: ProblemPage }) {
  const { category, items, page, pageCount } = result;
  const firstPage = Math.max(1, Math.min(page - 2, pageCount - 4));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => firstPage + index);
  const control = "inline-flex min-h-10 min-w-10 items-center justify-center rounded border border-[#30445f] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300";

  return <div className="content-panel">
    <nav className="workspace-actions" aria-label="內容分類">
      <Link aria-current={category === "problem" ? "page" : undefined} href={problemPageHref(result, 1, "problem")}>題解 · {result.problemCount}</Link>
      <Link aria-current={category === "note" ? "page" : undefined} href={problemPageHref(result, 1, "note")}>學習筆記 · {result.noteCount}</Link>
    </nav>
    <form action="/leetcode" method="get" key={`${category}:${result.query}:${result.difficulty}:${result.status}:${result.tag}`}>
      <input name="category" type="hidden" value={category} />
      <div className="content-filters">
        <label>搜尋題目<input defaultValue={result.query} maxLength={100} name="q" placeholder="題號、題名或標籤" type="search" /></label>
        <label>難度<select disabled={category === "note"} defaultValue={result.difficulty} name="difficulty"><option value="">全部難度</option>{["Easy", "Medium", "Hard"].map((value) => <option key={value}>{value}</option>)}</select></label>
        <label>進度<select disabled={category === "note"} defaultValue={result.status} name="status"><option value="">全部進度</option>{Object.entries(problemStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>主題<select defaultValue={result.tag} name="tag"><option value="">全部主題</option>{result.tags.map((value) => <option key={value}>{value}</option>)}</select></label>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="content-caption" role="status">共 {result.total} {category === "problem" ? "題" : "篇學習筆記"}{result.total ? `，顯示第 ${result.start}–${result.end} ${category === "problem" ? "題" : "篇"}` : ""} · 每頁 15 筆</p>
        <button className={control} type="submit">搜尋與篩選</button>
      </div>
    </form>
    {!items.length ? <div className="content-empty"><h2>{result.problemCount + result.noteCount ? "沒有符合條件的內容" : "解題紀錄準備中"}</h2><p>試著調整搜尋或篩選條件。</p></div> :
      <div className="problem-list">{items.map((problem) => <Link className="problem-row" href={`/leetcode/${problem.slug.split("/").map(encodeURIComponent).join("/")}`} key={problem.slug}>
        <span className="content-caption">{problem.id === null ? "筆記" : `#${problem.id}`}</span><div><h2>{problem.title}</h2><p>{problem.tags.join(" / ")}</p></div>
        <span data-difficulty={problem.difficulty ?? undefined}>{problem.difficulty ?? "—"}</span><span>{problem.status ? problemStatusLabels[problem.status] : "—"}</span>
      </Link>)}</div>}
    {pageCount > 1 ? (
      <nav aria-label="題目分頁" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[#26344d] pt-4">
        <p className="content-caption">第 {page} / {pageCount} 頁</p>
        <div className="flex flex-wrap gap-2">
          {page > 1 ? <Link className={control} href={problemPageHref(result, page - 1)}>上一頁</Link> : <span aria-disabled="true" className={`${control} opacity-40`}>上一頁</span>}
          {firstPage > 1 ? <Link aria-label="第 1 頁" className={control} href={problemPageHref(result, 1)}>1</Link> : null}
          {firstPage > 2 ? <span aria-hidden="true" className="self-center">…</span> : null}
          {pages.map((number) => <Link aria-current={page === number ? "page" : undefined} aria-label={`第 ${number} 頁`} className={`${control} ${page === number ? "border-cyan-300 bg-cyan-950/30 text-cyan-100" : ""}`} href={problemPageHref(result, number)} key={number}>{number}</Link>)}
          {pages.at(-1)! < pageCount - 1 ? <span aria-hidden="true" className="self-center">…</span> : null}
          {pages.at(-1)! < pageCount ? <Link aria-label={`第 ${pageCount} 頁`} className={control} href={problemPageHref(result, pageCount)}>{pageCount}</Link> : null}
          {page < pageCount ? <Link className={control} href={problemPageHref(result, page + 1)}>下一頁</Link> : <span aria-disabled="true" className={`${control} opacity-40`}>下一頁</span>}
        </div>
      </nav>
    ) : null}
  </div>;
}
