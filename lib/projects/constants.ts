import path from "node:path";

export const PROJECT_CONTENT_DIRECTORY = path.join(
  process.cwd(),
  "content",
  "projects",
);

export const PROJECT_DETAIL_FILE_NAME = "main.md";
export const PROJECT_META_FILE_NAME = "meta.json";
