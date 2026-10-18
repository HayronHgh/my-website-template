export function cleanProblemTitle(title: string, id: number | null | undefined) {
  if (!id) return title.trim();
  const prefix = new RegExp(`^(?:(?:leetcode|lc)\\s*[-:#]?\\s*)?#?${id}(?:\\s*[.．:：、)_-]\\s*|\\s+)(.+)$`, "i");
  return title.trim().match(prefix)?.[1].trim() || title.trim();
}

export function problemNotebookSlug(id: number, title: string) {
  const name = cleanProblemTitle(title, id).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 100).replace(/-$/, "");
  return `${id}-${name || "problem"}`;
}

export function formatProblemUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("zh-TW", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
  }).format(date);
}
