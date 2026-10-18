// Verified against notes/essential-50 and notes/daily-practice on the content host.
export const previouslyCompletedProblemIds = [
  1, 26, 27, 88, 125, 167, 283, 344, 217, 242,
  20, 206, 141, 704, 35, 21, 19, 2, 155, 232, 225,
  3, 209, 424, 567, 438, 904, 49, 128, 290, 202, 383, 349,
  94, 102, 104, 226, 200, 695, 733, 994,
  11, 238, 34, 33, 153, 739, 496, 46, 78, 100,
] as const;

export const previouslyCompletedProblems = new Set<number>(previouslyCompletedProblemIds);
