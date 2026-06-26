import type { BlogPostMeta, BlogSortOrder } from "@/types/blog";

const getPostTime = (post: BlogPostMeta) => {
  const time = new Date(post.date).getTime();
  return Number.isNaN(time) ? 0 : time;
};

const getPostOrder = (post: BlogPostMeta) =>
  typeof post.order === "number" ? post.order : 0;

const getPostRank = (post: BlogPostMeta) =>
  typeof post.featuredRank === "number" ? post.featuredRank : Number.POSITIVE_INFINITY;

export function comparePostsByPublishedOrder<Post extends BlogPostMeta>(
  left: Post,
  right: Post,
  sortOrder: BlogSortOrder = "newest",
) {
  const leftTime = getPostTime(left);
  const rightTime = getPostTime(right);
  const dateDelta = leftTime - rightTime;

  if (dateDelta !== 0) {
    return sortOrder === "oldest" ? dateDelta : -dateDelta;
  }

  const orderDelta = getPostOrder(left) - getPostOrder(right);

  if (orderDelta !== 0) {
    return sortOrder === "oldest" ? orderDelta : -orderDelta;
  }

  return left.slug.localeCompare(right.slug);
}

export const sortPostsByPublishedOrder = <Post extends BlogPostMeta>(
  posts: Post[],
  sortOrder: BlogSortOrder = "newest",
) =>
  [...posts].sort((left, right) => comparePostsByPublishedOrder(left, right, sortOrder));

export const sortPostsByFeaturedRankAndPublishedOrder = <Post extends BlogPostMeta>(
  posts: Post[],
) =>
  [...posts].sort((left, right) => {
    const leftRank = getPostRank(left);
    const rightRank = getPostRank(right);

    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return comparePostsByPublishedOrder(left, right, "newest");
  });
