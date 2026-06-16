import path from "node:path";
import {
  adjustmentNotes as fallbackAdjustmentNotes,
  blogPreviewPosts as fallbackBlogPreviewPosts,
  contactLinks as fallbackContactLinks,
  homePageData as fallbackHomePageData,
  navigationItems as fallbackNavigationItems,
  resumeExperience as fallbackResumeExperience,
  resumeSections as fallbackResumeSections,
  resumeSummary as fallbackResumeSummary,
  siteProfile as fallbackSiteProfile,
  skillItems as fallbackSkillItems,
  timelineItems as fallbackTimelineItems,
} from "@/data/site";
import { readTextFileWithMtimeCache } from "@/lib/content/cache";
import { isSafeMarkdownUrl } from "@/lib/content/url-policy";
import { siteConfig } from "@/lib/env";
import {
  getVersionedSiteAssetUrl,
  normalizeResumeDownloadUrl,
  SITE_CONTENT_DIRECTORY,
} from "@/lib/site/assets";
import type { PixelIconName } from "@/components/ui/pixel-icon";
import type {
  AdjustmentNote,
  BlogPreviewPost,
  ContactLink,
  NavigationItem,
  ProfileMeta,
  ProjectGroup,
  ResumeExperience,
  ResumeSection,
  SiteProfile,
  SkillItem,
  TimelineItem,
} from "@/data/site";

type SiteImage = {
  position?: string;
  src: string;
};

export type SitePageImages = {
  aboutAvatar: SiteImage;
  aboutHero: SiteImage;
  blogHero: SiteImage;
  homeHero: SiteImage;
  projectsHero: SiteImage;
  resumeHero: SiteImage;
};

export type RouteImageEntry = {
  href: string;
  src: string;
};

export type RuntimeHomePageData = typeof fallbackHomePageData;

export type SiteMetadataCopy = {
  description: string;
  title: string;
};

export type SiteHeroCopy = SiteMetadataCopy & {
  eyebrow?: string;
};

export type SiteLinkCopy = {
  href: string;
  label: string;
};

export type SiteStatCopy = {
  icon: PixelIconName;
  label: string;
  value: string;
};

export type ProjectCardLabels = {
  caseStudy: string;
  demo: string;
  details: string;
  repository: string;
};

export type SitePages = {
  about: {
    avatarAlt: string;
    hero: SiteHeroCopy;
    metadata: SiteMetadataCopy;
    principles: string[];
    principlesTitle: string;
    profileEyebrow: string;
    profileTitle: string;
    stats: SiteStatCopy[];
    timeline: {
      link: SiteLinkCopy;
      title: string;
    };
    toolsTitle: string;
  };
  blog: {
    card: {
      readLabel: string;
    };
    detail: {
      relatedProjectsTitle: string;
      standaloneLabel: string;
    };
    hero: SiteHeroCopy;
    latestLimit: number;
    metadata: SiteMetadataCopy;
    reader: {
      backLabel: string;
      noSelectionMessage: string;
      relatedProjectLabel: string;
    };
    search: {
      categoryFallback: string;
      clearSearchLabel: string;
      emptyMessage: string;
      hashtagsTitle: string;
      latestArticlesDescription: string;
      latestArticlesTitle: string;
      matchingArticlePlural: string;
      matchingArticleSingular: string;
      placeholder: string;
      readButtonLabel: string;
      quickReadButtonLabel: string;
      readTimeSuffix: string;
      removeTagLabel: string;
      searchResultsTitle: string;
    };
    series: {
      standaloneLabel: string;
      title: string;
    };
  };
  contact: {
    brief: {
      body: string;
      checklist: string[];
      checklistTitle: string;
      emailButtonLabel: string;
      kicker: string;
      title: string;
      topics: string[];
      topicsTitle: string;
    };
    header: SiteHeroCopy;
    linkButtonLabel: string;
    metadata: SiteMetadataCopy;
  };
  home: {
    dashboard: {
      aboutTitle: string;
      blogLink: SiteLinkCopy;
      blogTitle: string;
      contactEyebrow: string;
      contactTitle: string;
      featuredProjectsLink: SiteLinkCopy;
      featuredProjectsTitle: string;
      profileFactLabels: {
        email: string;
        location: string;
        status: string;
        timezone: string;
      };
      skillsLink: SiteLinkCopy;
      skillsTitle: string;
    };
    heroActions: {
      contact: SiteLinkCopy;
      projects: SiteLinkCopy;
      resume: SiteLinkCopy;
    };
    metadata: SiteMetadataCopy;
    timeline: {
      link: SiteLinkCopy;
      title: string;
    };
  };
  projectCard: ProjectCardLabels;
  projectDetail: {
    actions: ProjectCardLabels & {
      backToProjects: string;
    };
    fields: {
      category: string;
      maturity: string;
      scope: string;
      year: string;
    };
    notFoundTitle: string;
    publicBoundaryTitle: string;
    relatedArticlesTitle: string;
    summaryTitle: string;
    techStackTitle: string;
    verificationTitle: string;
  };
  projects: {
    actions: ProjectCardLabels;
    groups: Record<ProjectGroup, {
      description: string;
      title: string;
    }>;
    hero: SiteHeroCopy;
    indexTitle: string;
    metadata: SiteMetadataCopy;
    stats: {
      caseStudies: string;
      projects: string;
      systems: string;
      techTags: string;
    };
  };
  resume: {
    actions: {
      contact: SiteLinkCopy;
      download: SiteLinkCopy;
    };
    experienceScopeLabel: string;
    experienceTitle: string;
    heroTitle: string;
    metadata: SiteMetadataCopy;
    projectHighlightsTitle: string;
    skillsTitle: string;
    stats: SiteStatCopy[];
  };
};

export type SiteSettings = {
  adjustmentNotes: AdjustmentNote[];
  blogPreviewPosts: BlogPreviewPost[];
  contactLinks: ContactLink[];
  homePageData: RuntimeHomePageData;
  navigationItems: NavigationItem[];
  pageImages: SitePageImages;
  pages: SitePages;
  resumeExperience: ResumeExperience[];
  resumeSections: ResumeSection[];
  resumeSummary: string;
  routeImageMap: RouteImageEntry[];
  siteUrl: string;
  siteProfile: SiteProfile;
  skillItems: SkillItem[];
  timelineItems: TimelineItem[];
};

type SiteSettingsFile = Partial<
  Omit<SiteSettings, "homePageData" | "pageImages" | "pages" | "routeImageMap" | "siteProfile">
> & {
  homePageData?: Partial<RuntimeHomePageData>;
  pageImages?: Partial<Record<keyof SitePageImages, Partial<SiteImage> | string>>;
  pages?: Partial<SitePages>;
  profileMeta?: Partial<ProfileMeta>;
  routeImageMap?: RouteImageEntry[];
  siteProfile?: Partial<SiteProfile>;
};

const SITE_SETTINGS_FILE_PATH = path.join(SITE_CONTENT_DIRECTORY, "site.json");

const defaultPageImages: SitePageImages = {
  aboutAvatar: { src: "/pixel-engineer-avatar.svg" },
  aboutHero: { position: "center center", src: "/page-bg-journey.png" },
  blogHero: { position: "center center", src: "/page-bg-blog.png" },
  homeHero: { position: "center center", src: "/bg.png" },
  projectsHero: { position: "center center", src: "/page-bg-projects.png" },
  resumeHero: { position: "center center", src: "/page-bg-resume.png" },
};

const defaultPages: SitePages = {
  about: {
    avatarAlt: "Pixel style engineer avatar",
    hero: {
      description: fallbackSiteProfile.intro,
      title: "Journey",
    },
    metadata: {
      description: `Profile, working style, skills, and growth timeline for ${fallbackSiteProfile.brandName}.`,
      title: "About",
    },
    principles: fallbackSiteProfile.workingStyle,
    principlesTitle: "Route Principles",
    profileEyebrow: "Profile",
    profileTitle: "Growth notes from the route",
    stats: [
      { icon: "journey", label: "Years of Journey", value: "4+" },
      { icon: "projects", label: "Landed Cases", value: "3+" },
      { icon: "skills", label: "Tech Learned", value: "10+" },
      { icon: "heart", label: "Direction", value: "Build" },
    ],
    timeline: {
      link: { href: "/about", label: "More about my journey ->" },
      title: "Growth Timeline",
    },
    toolsTitle: "Tools Along the Route",
  },
  blog: {
    card: {
      readLabel: "Read signal",
    },
    detail: {
      relatedProjectsTitle: "Related Projects",
      standaloneLabel: "Standalone",
    },
    hero: {
      description: "A local markdown workspace for notes, case studies, and implementation writeups.",
      title: "Blog Signals",
    },
    latestLimit: 6,
    metadata: {
      description: "Searchable engineering notes with local markdown posts, hashtags, and a same-page reader.",
      title: "Blog",
    },
    reader: {
      backLabel: "Back to articles",
      noSelectionMessage: "Select an article to read.",
      relatedProjectLabel: "Related Project",
    },
    search: {
      categoryFallback: "Article",
      clearSearchLabel: "Clear search",
      emptyMessage: "No matching article.",
      hashtagsTitle: "Hashtags",
      latestArticlesDescription: "Recently published notes and writeups",
      latestArticlesTitle: "Latest articles",
      matchingArticlePlural: "matching articles",
      matchingArticleSingular: "matching article",
      placeholder: "Search title, summary, #tag",
      readButtonLabel: "Read Signal",
      quickReadButtonLabel: "Quick read",
      readTimeSuffix: "min read",
      removeTagLabel: "Remove tag",
      searchResultsTitle: "Search results",
    },
    series: {
      standaloneLabel: "Standalone",
      title: "Series",
    },
  },
  contact: {
    brief: {
      body:
        "Send a focused brief with the problem, target users, constraints, and preferred timeline. I can help shape the interface, architecture, or delivery plan from there.",
      checklist: ["Problem", "Target users", "Constraints", "Timeline"],
      checklistTitle: "What to include",
      emailButtonLabel: "Email Me",
      kicker: "terminal://brief",
      title: "Signal Brief",
      topics: [
        "Frontend architecture",
        "Product interface implementation",
        "Markdown / content workflow",
        "Next.js / TypeScript systems",
        "Engineering collaboration",
      ],
      topicsTitle: "Collaboration topics",
    },
    header: {
      description: "Open channels for product ideas, engineering collaboration, and technical notes.",
      eyebrow: "Contact",
      title: "Open channel for product and engineering missions",
    },
    linkButtonLabel: "Open link",
    metadata: {
      description: `Contact links and collaboration channels for ${fallbackSiteProfile.brandName}.`,
      title: "Contact",
    },
  },
  home: {
    dashboard: {
      aboutTitle: "About Me",
      blogLink: { href: "/blog", label: "View blog ->" },
      blogTitle: "Blog Signals",
      contactEyebrow: "Signal Links",
      contactTitle: "Connect",
      featuredProjectsLink: { href: "/projects", label: "View all ->" },
      featuredProjectsTitle: "Featured Projects",
      profileFactLabels: {
        email: "Email",
        location: "Location",
        status: "Status",
        timezone: "Timezone",
      },
      skillsLink: { href: "/resume", label: "More skills ->" },
      skillsTitle: "Skills",
    },
    heroActions: {
      contact: { href: "/contact", label: "Contact Me" },
      projects: { href: "/projects", label: "View Projects" },
      resume: { href: fallbackSiteProfile.resumeDownloadUrl, label: "Download Resume" },
    },
    metadata: {
      description: fallbackSiteProfile.positioning,
      title: "Home",
    },
    timeline: {
      link: { href: "/about", label: "More about my journey ->" },
      title: "Growth Timeline",
    },
  },
  projectCard: {
    caseStudy: "Case Study",
    demo: "Live Demo",
    details: "View Details",
    repository: "GitHub",
  },
  projectDetail: {
    actions: {
      backToProjects: "Back to Projects",
      caseStudy: "Case Study",
      demo: "Live Demo",
      details: "Details",
      repository: "GitHub",
    },
    fields: {
      category: "Category",
      maturity: "Maturity",
      scope: "Scope",
      year: "Year",
    },
    notFoundTitle: "Project not found",
    publicBoundaryTitle: "Public Boundary",
    relatedArticlesTitle: "Related Articles",
    summaryTitle: "Project Brief",
    techStackTitle: "Tech Stack",
    verificationTitle: "Verification Signals",
  },
  projects: {
    actions: {
      caseStudy: "Case Study",
      demo: "Live Demo",
      details: "Details",
      repository: "GitHub",
    },
    groups: {
      experiments: {
        description: "Game, algorithm, simulation, and security-learning side work.",
        title: "Experiments / Side Projects",
      },
      featured: {
        description: "Landed private cases presented as anonymized engineering case studies.",
        title: "Featured Projects",
      },
      systems: {
        description: "System-oriented builds that show AI, storage, and integration depth.",
        title: "Systems Projects",
      },
    },
    hero: {
      description: "Anonymized case studies, system builds, and experiments presented as pixel-night engineering cartridges.",
      title: "Projects",
    },
    indexTitle: "Project Index",
    metadata: {
      description: `Selected case studies, system builds, and experiments by ${fallbackSiteProfile.brandName}.`,
      title: "Projects",
    },
    stats: {
      caseStudies: "Case Studies",
      projects: "Projects",
      systems: "Systems",
      techTags: "Tech Tags",
    },
  },
  resume: {
    actions: {
      contact: { href: "/contact", label: "Contact Me" },
      download: { href: fallbackSiteProfile.resumeDownloadUrl, label: "Download CV" },
    },
    experienceScopeLabel: "Scope",
    experienceTitle: "Experience",
    heroTitle: "Resume",
    metadata: {
      description: "Practical build log, skills, experience, and project highlights.",
      title: "Resume",
    },
    projectHighlightsTitle: "Project Highlights",
    skillsTitle: "Skills",
    stats: [
      { icon: "journey", label: "Years Experience", value: "3+" },
      { icon: "location", label: "Based in", value: "{{location}}" },
      { icon: "mail", label: "Email", value: "{{email}}" },
      { icon: "heart", label: "Status", value: "Available" },
    ],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

async function readSettingsFile(): Promise<SiteSettingsFile> {
  try {
    const source = await readTextFileWithMtimeCache(SITE_SETTINGS_FILE_PATH);
    const parsedSource: unknown = JSON.parse(source);
    return isRecord(parsedSource) ? (parsedSource as SiteSettingsFile) : {};
  } catch {
    return {};
  }
}

function arrayOrFallback<T>(value: unknown, fallback: T[]) {
  return Array.isArray(value) ? (value as T[]) : fallback;
}

function stringOrFallback(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function numberOrFallback(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

function normalizeSiteUrl(value: unknown) {
  const siteUrl = trimTrailingSlash(stringOrFallback(value, siteConfig.url));

  try {
    const url = new URL(siteUrl);
    return url.protocol === "http:" || url.protocol === "https:"
      ? siteUrl
      : siteConfig.url;
  } catch {
    return siteConfig.url;
  }
}

function mergeRuntimeCopy<T>(fallback: T, source: unknown): T {
  if (Array.isArray(fallback)) {
    return Array.isArray(source) ? (source as T) : fallback;
  }

  if (isRecord(fallback)) {
    const output: Record<string, unknown> = { ...fallback };

    if (!isRecord(source)) {
      return output as T;
    }

    Object.entries(fallback).forEach(([key, fallbackValue]) => {
      output[key] = mergeRuntimeCopy(fallbackValue, source[key]);
    });

    Object.entries(source).forEach(([key, sourceValue]) => {
      if (!(key in output)) {
        output[key] = sourceValue;
      }
    });

    return output as T;
  }

  if (typeof fallback === "string") {
    return stringOrFallback(source, fallback) as T;
  }

  if (typeof fallback === "number") {
    return numberOrFallback(source, fallback) as T;
  }

  if (typeof fallback === "boolean") {
    return (typeof source === "boolean" ? source : fallback) as T;
  }

  return (source ?? fallback) as T;
}

function sanitizeRuntimeLinks(value: unknown, fallback: unknown): unknown {
  if (Array.isArray(value)) {
    const fallbackItems = Array.isArray(fallback) ? fallback : [];
    return value.map((item, index) => sanitizeRuntimeLinks(item, fallbackItems[index]));
  }

  if (!isRecord(value)) {
    return value;
  }

  const fallbackRecord = isRecord(fallback) ? fallback : {};
  const output: Record<string, unknown> = { ...value };

  Object.entries(output).forEach(([key, childValue]) => {
    if (key.toLowerCase() === "href" && typeof childValue === "string") {
      const fallbackHref = fallbackRecord[key];
      output[key] = isSafeMarkdownUrl(childValue, "link")
        ? childValue.trim()
        : typeof fallbackHref === "string"
          ? fallbackHref
          : "#";
      return;
    }

    output[key] = sanitizeRuntimeLinks(childValue, fallbackRecord[key]);
  });

  return output;
}

function resolvePages(source: SiteSettingsFile["pages"]): SitePages {
  const mergedPages = mergeRuntimeCopy(defaultPages, source);
  return sanitizeRuntimeLinks(mergedPages, defaultPages) as SitePages;
}

function createFacts(profileMeta: ProfileMeta) {
  return [
    { label: "Location", value: profileMeta.location },
    { label: "Email", value: profileMeta.email },
    { label: "Timezone", value: profileMeta.timezone },
    { label: "Status", value: profileMeta.status },
  ];
}

async function resolveSiteImage(
  source: Partial<SiteImage> | string | undefined,
  fallback: SiteImage,
): Promise<SiteImage> {
  const rawImage = typeof source === "string" ? { src: source } : source;
  const src = stringOrFallback(rawImage?.src, fallback.src);

  return {
    position: stringOrFallback(rawImage?.position, fallback.position ?? "center center"),
    src: await getVersionedSiteAssetUrl(src),
  };
}

async function resolvePageImages(source: SiteSettingsFile["pageImages"]): Promise<SitePageImages> {
  const [
    aboutAvatar,
    aboutHero,
    blogHero,
    homeHero,
    projectsHero,
    resumeHero,
  ] = await Promise.all([
    resolveSiteImage(source?.aboutAvatar, defaultPageImages.aboutAvatar),
    resolveSiteImage(source?.aboutHero, defaultPageImages.aboutHero),
    resolveSiteImage(source?.blogHero, defaultPageImages.blogHero),
    resolveSiteImage(source?.homeHero, defaultPageImages.homeHero),
    resolveSiteImage(source?.projectsHero, defaultPageImages.projectsHero),
    resolveSiteImage(source?.resumeHero, defaultPageImages.resumeHero),
  ]);

  return {
    aboutAvatar,
    aboutHero,
    blogHero,
    homeHero,
    projectsHero,
    resumeHero,
  };
}

function patchEmailContactLink(links: ContactLink[], profileMeta: ProfileMeta) {
  return links.map((link) =>
    link.icon === "mail"
      ? { ...link, href: `mailto:${profileMeta.email}`, value: profileMeta.email }
      : link,
  );
}

async function resolveRouteImageMap(
  source: SiteSettingsFile["routeImageMap"],
  pageImages: SitePageImages,
) {
  const fallback = [
    { href: "/", src: pageImages.homeHero.src },
    { href: "/projects", src: pageImages.projectsHero.src },
    { href: "/blog", src: pageImages.blogHero.src },
    { href: "/about", src: pageImages.aboutHero.src },
    { href: "/resume", src: pageImages.resumeHero.src },
  ];

  return Promise.all(
    arrayOrFallback(source, fallback).map(async (entry) => ({
      href: entry.href,
      src: await getVersionedSiteAssetUrl(entry.src),
    })),
  );
}

export async function getSiteSettings(): Promise<SiteSettings> {
  const settings = await readSettingsFile();
  const profileMeta: ProfileMeta = {
    location: stringOrFallback(settings.profileMeta?.location, fallbackSiteProfile.location),
    email: stringOrFallback(settings.profileMeta?.email, fallbackSiteProfile.email),
    timezone: stringOrFallback(settings.profileMeta?.timezone, fallbackSiteProfile.timezone),
    status: stringOrFallback(settings.profileMeta?.status, fallbackSiteProfile.status),
  };
  const siteProfile: SiteProfile = {
    ...fallbackSiteProfile,
    ...settings.siteProfile,
    ...profileMeta,
    facts: settings.siteProfile?.facts ?? createFacts(profileMeta),
    heroSkills: arrayOrFallback(settings.siteProfile?.heroSkills, fallbackSiteProfile.heroSkills),
    resumeDownloadUrl: normalizeResumeDownloadUrl(settings.siteProfile?.resumeDownloadUrl),
    workingStyle: arrayOrFallback(settings.siteProfile?.workingStyle, fallbackSiteProfile.workingStyle),
    specialties: arrayOrFallback(settings.siteProfile?.specialties, fallbackSiteProfile.specialties),
  };
  const navigationItems = arrayOrFallback(settings.navigationItems, fallbackNavigationItems);
  const timelineItems = arrayOrFallback(settings.timelineItems, fallbackTimelineItems);
  const skillItems = arrayOrFallback(settings.skillItems, fallbackSkillItems);
  const blogPreviewPosts = arrayOrFallback(settings.blogPreviewPosts, fallbackBlogPreviewPosts);
  const contactLinks = patchEmailContactLink(
    arrayOrFallback(settings.contactLinks, fallbackContactLinks),
    profileMeta,
  );
  const pageImages = await resolvePageImages(settings.pageImages);
  const routeImageMap = await resolveRouteImageMap(settings.routeImageMap, pageImages);
  const pages = resolvePages(settings.pages);
  const siteUrl = normalizeSiteUrl(settings.siteUrl);
  const homePageData: RuntimeHomePageData = {
    ...fallbackHomePageData,
    ...settings.homePageData,
    hero: {
      ...fallbackHomePageData.hero,
      ...settings.homePageData?.hero,
      description: settings.homePageData?.hero?.description ?? siteProfile.positioning,
      techStack: settings.homePageData?.hero?.techStack ?? siteProfile.heroSkills,
      titleTop: settings.homePageData?.hero?.titleTop ?? siteProfile.headline,
      titleBottom: settings.homePageData?.hero?.titleBottom ?? siteProfile.role,
    },
    profileMeta,
    timeline: timelineItems,
    skills: skillItems,
    articles: blogPreviewPosts,
  };

  if (!settings.pages?.home?.metadata?.description) {
    pages.home.metadata.description = siteProfile.positioning;
  }

  if (!settings.pages?.home?.heroActions?.resume?.href) {
    pages.home.heroActions.resume.href = siteProfile.resumeDownloadUrl;
  }

  if (!settings.pages?.resume?.actions?.download?.href) {
    pages.resume.actions.download.href = siteProfile.resumeDownloadUrl;
  }

  pages.home.heroActions.resume.href = normalizeResumeDownloadUrl(
    pages.home.heroActions.resume.href,
  );
  pages.resume.actions.download.href = normalizeResumeDownloadUrl(
    pages.resume.actions.download.href,
  );

  return {
    adjustmentNotes: arrayOrFallback(settings.adjustmentNotes, fallbackAdjustmentNotes),
    blogPreviewPosts,
    contactLinks,
    homePageData,
    navigationItems,
    pageImages,
    pages,
    resumeExperience: arrayOrFallback(settings.resumeExperience, fallbackResumeExperience),
    resumeSections: arrayOrFallback(settings.resumeSections, fallbackResumeSections),
    resumeSummary: stringOrFallback(settings.resumeSummary, fallbackResumeSummary),
    routeImageMap,
    siteUrl,
    siteProfile,
    skillItems,
    timelineItems,
  };
}
