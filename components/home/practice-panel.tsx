import { NeonButton } from "@/components/ui/neon-button";
import { PixelCard } from "@/components/ui/pixel-card";

export type PracticeStats = {
  difficulty: { easy: number; hard: number; medium: number };
  notes: number;
  published: number;
  solved: number;
};

const difficultyRows = [
  ["easy", "Easy"],
  ["medium", "Medium"],
  ["hard", "Hard"],
] as const;

export function PracticePanel({ stats }: { stats: PracticeStats }) {
  const ranked = stats.difficulty.easy + stats.difficulty.medium + stats.difficulty.hard;

  return (
    <PixelCard accent="amber" as="section" className="practice-panel">
      <p className="pixel-section-kicker text-amber-100">
        <span className="pixel-section-icon pixel-section-icon-skills" aria-hidden />
        Algorithm Practice
      </p>
      <p className="practice-intro">記錄解題思路、複雜度分析與複習筆記。</p>

      <dl className="practice-stats">
        <div className="practice-stat-primary">
          <dt>Solved</dt>
          <dd>{stats.solved}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>{stats.published}</dd>
        </div>
        <div>
          <dt>Notes</dt>
          <dd>{stats.notes}</dd>
        </div>
      </dl>

      {ranked ? (
        <div className="practice-difficulty">
          <div className="practice-difficulty-bar" aria-hidden>
            {difficultyRows.map(([key]) =>
              stats.difficulty[key] ? (
                <span data-level={key} key={key} style={{ flexGrow: stats.difficulty[key] }} />
              ) : null,
            )}
          </div>
          <ul>
            {difficultyRows.map(([key, label]) => (
              <li data-level={key} key={key}>
                {label}
                <strong>{stats.difficulty[key]}</strong>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <NeonButton accent="amber" className="practice-cta" href="/leetcode" variant="secondary">
        Browse practice notes
      </NeonButton>
    </PixelCard>
  );
}
