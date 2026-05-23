export type Project = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  stack: string[];
  liveUrl: string;
  repoUrl?: string;
  featured: boolean;
};
