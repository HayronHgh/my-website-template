import type { ProjectItem } from "@/data/site";
import type { BlogPostMeta } from "@/types/blog";

const normalizeRelationKey = (value: string) => value.trim().toLowerCase();

const getBlogSlugFromUrl = (url?: string) => {
  if (!url?.startsWith("/blog/")) {
    return undefined;
  }

  return url.replace(/^\/blog\/+/, "").replace(/\/+$/, "");
};

function createProjectRelationKeys(project: ProjectItem) {
  return new Set(
    [
      project.slug,
      project.category,
      project.maturity,
      ...(project.tech ?? []),
      ...(project.relatedTags ?? []),
    ]
      .filter((entry): entry is string => Boolean(entry))
      .map(normalizeRelationKey),
  );
}

function createPostRelationKeys(post: BlogPostMeta) {
  return new Set(
    [...post.tags, ...(post.relatedProjects ?? [])]
      .filter(Boolean)
      .map(normalizeRelationKey),
  );
}

function getDateRank(post: BlogPostMeta) {
  const time = new Date(post.date).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function getRelatedPostsForProject(
  project: ProjectItem,
  posts: BlogPostMeta[],
  limit = 4,
) {
  const projectKeys = createProjectRelationKeys(project);
  const caseStudySlug = getBlogSlugFromUrl(project.caseStudyUrl);

  return posts
    .map((post) => {
      const postKeys = createPostRelationKeys(post);
      let score = post.slug === caseStudySlug ? 100 : 0;

      if (post.relatedProjects?.includes(project.slug)) {
        score += 80;
      }

      postKeys.forEach((key) => {
        if (projectKeys.has(key)) {
          score += 8;
        }
      });

      return { post, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return getDateRank(right.post) - getDateRank(left.post);
    })
    .slice(0, limit)
    .map((entry) => entry.post);
}

export function getRelatedProjectsForPost(
  post: BlogPostMeta,
  projects: ProjectItem[],
  limit = 4,
) {
  const postKeys = createPostRelationKeys(post);

  return projects
    .map((project) => {
      const projectKeys = createProjectRelationKeys(project);
      let score = post.relatedProjects?.includes(project.slug) ? 100 : 0;

      if (getBlogSlugFromUrl(project.caseStudyUrl) === post.slug) {
        score += 90;
      }

      projectKeys.forEach((key) => {
        if (postKeys.has(key)) {
          score += 8;
        }
      });

      return { project, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return (left.project.order ?? Number.POSITIVE_INFINITY) -
        (right.project.order ?? Number.POSITIVE_INFINITY);
    })
    .slice(0, limit)
    .map((entry) => entry.project);
}
