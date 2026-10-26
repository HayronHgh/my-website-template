/** Normalize legacy article-return labels while retaining custom site copy. */
export function getArticleBackLabel(label: string) {
  return /^back to (?:notes|articles)$/i.test(label.trim()) ? "Back" : label;
}
