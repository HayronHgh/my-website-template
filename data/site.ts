export type GlowTone = "cyan" | "blue" | "purple" | "pink" | "amber";
export type SkillTone = "cyan" | "green" | "blue" | "purple" | "amber";
export type Accent = GlowTone | SkillTone;

export type NavIcon = "home" | "projects" | "file" | "journey" | "resume" | "contact";

export type NavItem = {
  key: string;
  label: string;
  href: string;
  glow: GlowTone;
  icon: NavIcon;
};

export type NavigationItem = NavItem;

export type ProfileMeta = {
  location: string;
  email: string;
  timezone: string;
  status: string;
};

export type SiteProfile = ProfileMeta & {
  name: string;
  brandName: string;
  role: string;
  headline: string;
  positioning: string;
  intro: string;
  resumeDownloadUrl: string;
  heroSkills: string[];
  facts: Array<{
    label: string;
    value: string;
  }>;
  workingStyle: string[];
  specialties: string[];
};

export type TimelineItem = {
  year: string;
  title: string;
  summary: string;
};

export type SkillLevel = "Strong" | "Practical" | "Applied" | "Exploring";

export type SkillItem = {
  name: string;
  value: number;
  tone: SkillTone;
  note?: string;
  level?: SkillLevel;
  evidence?: string[];
};

export type ProjectGroup = "featured" | "systems" | "experiments";
export type ProjectMaturity =
  | "Production"
  | "Case Study"
  | "Capstone"
  | "Prototype"
  | "Research"
  | "Learning Archive";

export type ProjectCard = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  tech: string[];
  cover: string;
  coverPosition: string;
};

export type ProjectItem = ProjectCard & {
  description: string;
  accent: Accent;
  detailsUrl: string;
  caseStudyUrl?: string;
  demoUrl?: string;
  group?: ProjectGroup;
  maturity?: ProjectMaturity;
  order?: number;
  outcomes?: string[];
  privateCase?: boolean;
  published?: boolean;
  publicBoundary?: string;
  relatedTags?: string[];
  repoUrl?: string;
  scope?: string;
  year?: string;
};

export type ArticleCard = {
  slug: string;
  category: string;
  date: string;
  title: string;
  excerpt: string;
};

export type BlogPreviewPost = ArticleCard & {
  href: string;
};

export type ResumeExperience = {
  period: string;
  title: string;
  organization: string;
  description: string;
  highlights: string[];
  tech?: string[];
};

export type ResumeSection = {
  title: string;
  items: string[];
};

export type ContactLink = {
  label: string;
  href: string;
  value: string;
  icon: "github" | "linkedin" | "mail" | "rss";
  accent: Accent;
};

export type AdjustmentNote = {
  id: string;
  text: string;
  accent: Accent;
};

const profileMeta: ProfileMeta = {
  location: "Remote / Your City",
  email: "hello@example.com",
  timezone: "UTC+0",
  status: "Open to projects",
};

export const siteProfile: SiteProfile = {
  ...profileMeta,
  name: "Your Name",
  brandName: "PortfolioKit",
  role: "Software Engineer",
  headline: "Hi, I'm Your Name",
  positioning:
    "A file-driven portfolio template for publishing project cards, case studies, and technical notes without rebuilding the app.",
  intro:
    "This template is designed for developers who want a portfolio that behaves like a lightweight content system. Projects and blog posts live in local files, can be mounted into Docker at runtime, and stay connected through tags and related project metadata.",
  resumeDownloadUrl: "/resume.pdf",
  heroSkills: [
    "Runtime Content",
    "Project Case Studies",
    "Markdown Blog",
    "Docker Friendly",
    "Tag Relations",
  ],
  facts: [
    { label: "Location", value: profileMeta.location },
    { label: "Email", value: profileMeta.email },
    { label: "Timezone", value: profileMeta.timezone },
    { label: "Status", value: profileMeta.status },
  ],
  workingStyle: [
    "Keep content close to the codebase, but load it at runtime.",
    "Separate card metadata from long-form markdown detail pages.",
    "Use related tags to connect project evidence with technical articles.",
  ],
  specialties: [
    "Next.js App Router",
    "Runtime markdown content",
    "File-based project metadata",
    "Docker volume publishing",
    "Accessible pixel-night UI",
    "Content-driven portfolio workflow",
  ],
};

export const navigationItems: NavigationItem[] = [
  { key: "home", href: "/", label: "Home", icon: "home", glow: "cyan" },
  { key: "projects", href: "/projects", label: "Projects", icon: "projects", glow: "blue" },
  { key: "blog", href: "/blog", label: "Blog", icon: "file", glow: "purple" },
  { key: "journey", href: "/about", label: "Journey", icon: "journey", glow: "pink" },
  { key: "resume", href: "/resume", label: "Resume", icon: "resume", glow: "amber" },
  { key: "contact", href: "/contact", label: "Contact", icon: "contact", glow: "cyan" },
];

export const timelineItems: TimelineItem[] = [
  {
    year: "2022",
    title: "Foundation",
    summary: "Replace this item with your education, self-learning, or first project milestone.",
  },
  {
    year: "2023",
    title: "First Systems",
    summary: "Describe how your early experiments became usable tools or project evidence.",
  },
  {
    year: "2024",
    title: "Delivery Practice",
    summary: "Summarize real workflow, product, or team experience that shaped your engineering style.",
  },
  {
    year: "2025",
    title: "Case Studies",
    summary: "Turn completed projects into readable case studies with outcomes and tradeoffs.",
  },
  {
    year: "2026",
    title: "Public Portfolio",
    summary: "Publish project pages, blog notes, screenshots, and benchmarks as reusable proof.",
  },
];

export const skillItems: SkillItem[] = [
  {
    name: "Frontend Systems",
    value: 90,
    tone: "cyan",
    level: "Strong",
    note: "Replace this with evidence from your UI, app shell, and interaction work.",
    evidence: ["React", "Next.js", "UI architecture"],
  },
  {
    name: "Content Workflow",
    value: 86,
    tone: "green",
    level: "Strong",
    note: "Projects and posts are editable through files and can be mounted at runtime.",
    evidence: ["Markdown", "JSON metadata", "Runtime loader"],
  },
  {
    name: "Backend/API",
    value: 78,
    tone: "blue",
    level: "Practical",
    note: "Use this row for API, server actions, database, or integration experience.",
    evidence: ["API routes", "Data flow", "Integration"],
  },
  {
    name: "Performance",
    value: 74,
    tone: "amber",
    level: "Applied",
    note: "Document benchmark evidence, bundle size, image strategy, and caching choices.",
    evidence: ["Build check", "Audit check", "Runtime IO"],
  },
  {
    name: "Security",
    value: 72,
    tone: "purple",
    level: "Applied",
    note: "Raw HTML is disabled in markdown and asset paths are constrained to content folders.",
    evidence: ["Path guard", "No raw HTML", "Audit workflow"],
  },
  {
    name: "Documentation",
    value: 80,
    tone: "cyan",
    level: "Practical",
    note: "README, project detail pages, and blog posts explain design decisions.",
    evidence: ["Architecture", "Tradeoffs", "Screenshots"],
  },
];

export const projectItems: ProjectItem[] = [];

export const blogPreviewPosts: BlogPreviewPost[] = [
  {
    slug: "template-architecture",
    category: "Architecture",
    date: "2026-01-05",
    title: "Template Architecture",
    excerpt: "A starter article describing the file-driven portfolio architecture.",
    href: "/blog/template-architecture",
  },
  {
    slug: "runtime-content-workflow",
    category: "Workflow",
    date: "2026-01-04",
    title: "Runtime Content Workflow",
    excerpt: "How project metadata and markdown content can update without rebuilding.",
    href: "/blog/runtime-content-workflow",
  },
  {
    slug: "benchmark-notes",
    category: "Benchmark",
    date: "2026-01-03",
    title: "Benchmark Notes",
    excerpt: "A placeholder for build, audit, route, and runtime content checks.",
    href: "/blog/benchmark-notes",
  },
];

export const homePageData = {
  hero: {
    eyebrow: "Portfolio Template",
    titleTop: siteProfile.headline,
    titleBottom: siteProfile.role,
    description: siteProfile.positioning,
    techStack: siteProfile.heroSkills,
  },
  profileMeta,
  timeline: timelineItems,
  projects: projectItems,
  skills: skillItems,
  articles: blogPreviewPosts,
};

export const resumeSummary =
  "A sanitized resume template for presenting experience, skills, project highlights, and contact information.";

export const resumeExperience: ResumeExperience[] = [
  {
    period: "2025 - Present",
    title: "Software Engineer / Portfolio Owner",
    organization: "Your Company or Independent Work",
    description:
      "Replace this with your real experience summary. Focus on ownership, scope, systems delivered, and measurable results.",
    highlights: [
      "Built and maintained project pages through file-based metadata and markdown content.",
      "Connected project case studies with blog articles through tags and related project fields.",
      "Validated the template with typecheck, lint, build, and dependency audit checks.",
    ],
    tech: ["Next.js", "TypeScript", "Markdown", "Docker"],
  },
  {
    period: "2024 - 2025",
    title: "Project Contributor",
    organization: "Team, School, Client, or Open Source",
    description:
      "Use this entry for a second experience block. Keep it outcome-oriented and specific.",
    highlights: [
      "Implemented a feature from requirements to release.",
      "Improved documentation, testing, or deployment workflow.",
      "Captured tradeoffs and future work in a project detail page.",
    ],
    tech: ["React", "API", "Testing", "Documentation"],
  },
];

export const resumeSections: ResumeSection[] = [
  {
    title: "Education",
    items: ["Your School / Program", "Certification or training"],
  },
  {
    title: "Core Stack",
    items: ["Next.js", "TypeScript", "React", "Tailwind CSS", "Markdown"],
  },
  {
    title: "Evidence",
    items: ["Runtime content", "Project metadata", "Blog relations", "Docker volume"],
  },
];

export const contactLinks: ContactLink[] = [
  {
    label: "GitHub",
    href: "https://github.com/your-name",
    value: "@your-name",
    icon: "github",
    accent: "cyan",
  },
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/in/your-name/",
    value: "linkedin.com/in/your-name",
    icon: "linkedin",
    accent: "blue",
  },
  {
    label: "Email",
    href: `mailto:${profileMeta.email}`,
    value: profileMeta.email,
    icon: "mail",
    accent: "pink",
  },
  {
    label: "Blog RSS",
    href: "/rss.xml",
    value: "Latest notes feed",
    icon: "rss",
    accent: "amber",
  },
];

export const adjustmentNotes: AdjustmentNote[] = [
  {
    id: "content",
    text: "Projects and blog posts are loaded from files at runtime.",
    accent: "cyan",
  },
  {
    id: "security",
    text: "Markdown raw HTML is disabled for safer template usage.",
    accent: "purple",
  },
  {
    id: "docker",
    text: "Content folders can be mounted into Docker without rebuilding.",
    accent: "blue",
  },
];
