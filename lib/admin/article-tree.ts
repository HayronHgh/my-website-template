import type { AdminArticleListItem } from "@/types/admin";

export const ROOT_ARTICLE_GROUP_KEY = "root:";

export function getAdminArticleGroupKey(category: string | null) {
  return category === null ? ROOT_ARTICLE_GROUP_KEY : `category:${category}`;
}

export type AdminArticleGroup = {
  articles: AdminArticleListItem[];
  category: string | null;
  key: string;
  label: string;
};

export function groupAdminArticles(
  articles: readonly AdminArticleListItem[],
): AdminArticleGroup[] {
  const groups = new Map<string, AdminArticleGroup>();

  for (const article of articles) {
    const category = article.pathSegments.length === 2 ? article.pathSegments[0] : null;
    const key = getAdminArticleGroupKey(category);
    const current = groups.get(key);

    if (current) {
      current.articles.push(article);
      continue;
    }

    groups.set(key, {
      articles: [article],
      category,
      key,
      label: category ?? "根目錄",
    });
  }

  return [...groups.values()].sort((left, right) => {
    if (left.category === null) return -1;
    if (right.category === null) return 1;
    return left.label.localeCompare(right.label, "zh-TW", {
      numeric: true,
      sensitivity: "base",
    });
  });
}

export function getAdminArticleLeafSlug(article: AdminArticleListItem) {
  return article.pathSegments.at(-1) ?? article.slug;
}
