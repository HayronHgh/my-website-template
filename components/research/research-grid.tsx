import Link from "next/link";
import { Play } from "lucide-react";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { researchStageLabels } from "@/lib/research/schema";
import type { AdminArticleListItem } from "@/types/admin";

type ResearchEntry = AdminArticleListItem & { hasExperiment: boolean };

export function ResearchGrid({ entries }: { entries: ResearchEntry[] }) {
  if (!entries.length) {
    return <div className="content-panel content-empty"><h2>研究紀錄整理中</h2><p>於後台發佈研究文章後，這裡會依研究排序呈現。</p></div>;
  }
  return (
    <div className="research-grid">
      {entries.map((entry, index) => (
        <Link
          className="research-card"
          data-glow="green"
          href={`/research/${entry.slug.split("/").map(encodeURIComponent).join("/")}`}
          key={entry.slug}
        >
          <div className="research-card-meta">
            <span>#{String(entry.research?.rank ?? index + 1).padStart(2, "0")}</span>
            <span>{entry.research ? researchStageLabels[entry.research.stage] : "Research"}</span>
          </div>
          <div>
            <p className="research-card-area">{entry.research?.area ?? "Research"}</p>
            <h2>{entry.title}</h2>
            <p>{entry.description}</p>
          </div>
          <footer>
            <span>{entry.tags.slice(0, 3).join(" / ")}</span>
            <span>{entry.hasExperiment ? "互動實驗" : "研究筆記"} {entry.hasExperiment ? <Play aria-hidden className="inline h-3 w-3" /> : <PixelIcon className="inline h-3 w-3" name="file" />}</span>
          </footer>
        </Link>
      ))}
    </div>
  );
}
