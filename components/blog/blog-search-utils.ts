import type { BlogPost } from "@/types/blog";

export type ParsedBlogSearchQuery = {
  textTerms: string[];
  tagFilters: string[];
};

export function normalizeSearchValue(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function getTagToken(tag: string) {
  return tag.trim().replace(/\s+/g, "-");
}

export function getTagSearchKey(tag: string) {
  return normalizeSearchValue(getTagToken(tag));
}

export function parseBlogSearchQuery(query: string): ParsedBlogSearchQuery {
  const textTerms: string[] = [];
  const tagFilters: string[] = [];

  query
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean)
    .forEach((token) => {
      if (token.startsWith("#") && token.length > 1) {
        tagFilters.push(getTagSearchKey(token.slice(1)));
        return;
      }

      textTerms.push(normalizeSearchValue(token));
    });

  return {
    textTerms,
    tagFilters: [...new Set(tagFilters)],
  };
}

export function addTagToQuery(query: string, tag: string) {
  const parsedQuery = parseBlogSearchQuery(query);
  const tagKey = getTagSearchKey(tag);

  if (parsedQuery.tagFilters.includes(tagKey)) {
    return query;
  }

  return [query.trim(), `#${getTagToken(tag)}`].filter(Boolean).join(" ");
}

export function removeTagFromQuery(query: string, tag: string) {
  const tagKey = getTagSearchKey(tag);

  return query
    .split(/\s+/)
    .filter((token) => {
      if (!token.startsWith("#") || token.length === 1) {
        return true;
      }

      return getTagSearchKey(token.slice(1)) !== tagKey;
    })
    .join(" ");
}

const getFuzzyScore = (value: string, term: string) => {
  const normalizedValue = normalizeSearchValue(value);
  const exactIndex = normalizedValue.indexOf(term);

  if (exactIndex >= 0) {
    return 100 - Math.min(exactIndex, 50);
  }

  let termIndex = 0;
  let gaps = 0;
  let lastMatchIndex = -1;

  for (let valueIndex = 0; valueIndex < normalizedValue.length; valueIndex += 1) {
    if (normalizedValue[valueIndex] !== term[termIndex]) {
      continue;
    }

    if (lastMatchIndex >= 0) {
      gaps += valueIndex - lastMatchIndex - 1;
    }

    termIndex += 1;
    lastMatchIndex = valueIndex;

    if (termIndex === term.length) {
      return Math.max(10, 60 - gaps);
    }
  }

  return 0;
};

export function scoreBlogPost(post: BlogPost, parsedQuery: ParsedBlogSearchQuery) {
  const postTagKeys = post.tags.map(getTagSearchKey);
  const matchesTags = parsedQuery.tagFilters.every((tagFilter) =>
    postTagKeys.includes(tagFilter),
  );

  if (!matchesTags) {
    return null;
  }

  if (parsedQuery.textTerms.length === 0) {
    return parsedQuery.tagFilters.length * 1000;
  }

  let score = parsedQuery.tagFilters.length * 1000;

  for (const term of parsedQuery.textTerms) {
    const titleScore = getFuzzyScore(post.title, term) * 4;
    const tagScore = Math.max(...post.tags.map((tag) => getFuzzyScore(tag, term)), 0) * 3;
    const summaryScore = getFuzzyScore(post.summary, term);
    const bestScore = Math.max(titleScore, tagScore, summaryScore);

    if (bestScore <= 0) {
      return null;
    }

    score += bestScore;
  }

  return score;
}
