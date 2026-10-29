"use client";
import { useMemo } from "react";
import { diffLines } from "diff";
export function WritingDiff({
  before,
  after,
}: {
  before: string;
  after: string;
}) {
  const changes = useMemo(
    () => diffLines(before, after, { timeout: 100, maxEditLength: 2000 }),
    [before, after],
  );
  if (!changes)
    return (
      <>
        <p>變更較大，顯示全文比較。</p>
        <div className="writing-diff">
          <pre>{before}</pre>
          <pre>{after}</pre>
        </div>
      </>
    );
  return (
    <div className="writing-diff">
      <section>
        <h3>目前正式版本 · 刪除以紅色標示</h3>
        <pre>
          {changes
            .filter((c) => !c.added)
            .map((c, i) => (
              <span className={c.removed ? "writing-diff-removed" : ""} key={i}>
                {c.value}
              </span>
            ))}
        </pre>
      </section>
      <section>
        <h3>工作稿 · 新增以綠色標示</h3>
        <pre>
          {changes
            .filter((c) => !c.removed)
            .map((c, i) => (
              <span className={c.added ? "writing-diff-added" : ""} key={i}>
                {c.value}
              </span>
            ))}
        </pre>
      </section>
    </div>
  );
}
