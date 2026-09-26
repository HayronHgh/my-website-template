import Link from "next/link";
import { PixelCard } from "@/components/ui/pixel-card";
import type { FocusData } from "@/lib/site/focus";

export function FocusPanel({ data, preview = false }: { data: FocusData; preview?: boolean }) {
  const items = data.items.filter((item) => item.enabled);
  if (!data.enabled || !items.length) return preview ? <p className="content-caption">Focus 目前隱藏；啟用區塊及至少一個項目即可展示。</p> : null;
  return <PixelCard accent="purple" as="section" className="focus-panel">
    <h2 className="pixel-section-kicker"><span className="pixel-section-icon pixel-section-icon-skills" aria-hidden />{data.title}</h2>
    <div className="focus-items">{items.map((item, index) => <article className={index === 0 ? "focus-primary" : "focus-secondary"} key={index}>
      {index === 0 ? <p className="focus-caption">目前主要投入</p> : null}
      <div className="focus-heading"><h3>{item.title}</h3>{item.status ? <span>{item.status}</span> : null}</div>
      {item.description ? <p className="focus-description">{item.description}</p> : null}
      {item.href ? preview ? <span className="focus-link">{item.linkLabel}</span> : <Link className="focus-link" href={item.href}>{item.linkLabel}</Link> : null}
    </article>)}</div>
  </PixelCard>;
}
