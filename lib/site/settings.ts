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
import { getSiteAssetUrl, SITE_CONTENT_DIRECTORY } from "@/lib/site/assets";
import type {
  AdjustmentNote,
  BlogPreviewPost,
  ContactLink,
  NavigationItem,
  ProfileMeta,
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

export type SiteSettings = {
  adjustmentNotes: AdjustmentNote[];
  blogPreviewPosts: BlogPreviewPost[];
  contactLinks: ContactLink[];
  homePageData: RuntimeHomePageData;
  navigationItems: NavigationItem[];
  pageImages: SitePageImages;
  resumeExperience: ResumeExperience[];
  resumeSections: ResumeSection[];
  resumeSummary: string;
  routeImageMap: RouteImageEntry[];
  siteProfile: SiteProfile;
  skillItems: SkillItem[];
  timelineItems: TimelineItem[];
};

type SiteSettingsFile = Partial<
  Omit<SiteSettings, "homePageData" | "pageImages" | "routeImageMap" | "siteProfile">
> & {
  homePageData?: Partial<RuntimeHomePageData>;
  pageImages?: Partial<Record<keyof SitePageImages, Partial<SiteImage> | string>>;
  profileMeta?: Partial<ProfileMeta>;
  routeImageMap?: RouteImageEntry[];
  siteProfile?: Partial<SiteProfile>;
};

const SITE_SETTINGS_FILE_PATH = path.join(SITE_CONTENT_DIRECTORY, "site.json");

const defaultPageImages: SitePageImages = {
  aboutAvatar: { src: "/about.svg" },
  aboutHero: { position: "center center", src: "/journey.svg" },
  blogHero: { position: "center center", src: "/file.svg" },
  homeHero: { position: "center center", src: "/globe.svg" },
  projectsHero: { position: "center center", src: "/projects.svg" },
  resumeHero: { position: "center center", src: "/resume.svg" },
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

function createFacts(profileMeta: ProfileMeta) {
  return [
    { label: "Location", value: profileMeta.location },
    { label: "Email", value: profileMeta.email },
    { label: "Timezone", value: profileMeta.timezone },
    { label: "Status", value: profileMeta.status },
  ];
}

function resolveSiteImage(
  source: Partial<SiteImage> | string | undefined,
  fallback: SiteImage,
): SiteImage {
  const rawImage = typeof source === "string" ? { src: source } : source;
  const src = stringOrFallback(rawImage?.src, fallback.src);

  return {
    position: stringOrFallback(rawImage?.position, fallback.position ?? "center center"),
    src: getSiteAssetUrl(src),
  };
}

function resolvePageImages(source: SiteSettingsFile["pageImages"]): SitePageImages {
  return {
    aboutAvatar: resolveSiteImage(source?.aboutAvatar, defaultPageImages.aboutAvatar),
    aboutHero: resolveSiteImage(source?.aboutHero, defaultPageImages.aboutHero),
    blogHero: resolveSiteImage(source?.blogHero, defaultPageImages.blogHero),
    homeHero: resolveSiteImage(source?.homeHero, defaultPageImages.homeHero),
    projectsHero: resolveSiteImage(source?.projectsHero, defaultPageImages.projectsHero),
    resumeHero: resolveSiteImage(source?.resumeHero, defaultPageImages.resumeHero),
  };
}

function patchEmailContactLink(links: ContactLink[], profileMeta: ProfileMeta) {
  return links.map((link) =>
    link.icon === "mail"
      ? { ...link, href: `mailto:${profileMeta.email}`, value: profileMeta.email }
      : link,
  );
}

function resolveRouteImageMap(
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

  return arrayOrFallback(source, fallback).map((entry) => ({
    href: entry.href,
    src: getSiteAssetUrl(entry.src),
  }));
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
  const pageImages = resolvePageImages(settings.pageImages);
  const routeImageMap = resolveRouteImageMap(settings.routeImageMap, pageImages);
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

  return {
    adjustmentNotes: arrayOrFallback(settings.adjustmentNotes, fallbackAdjustmentNotes),
    blogPreviewPosts,
    contactLinks,
    homePageData,
    navigationItems,
    pageImages,
    resumeExperience: arrayOrFallback(settings.resumeExperience, fallbackResumeExperience),
    resumeSections: arrayOrFallback(settings.resumeSections, fallbackResumeSections),
    resumeSummary: stringOrFallback(settings.resumeSummary, fallbackResumeSummary),
    routeImageMap,
    siteProfile,
    skillItems,
    timelineItems,
  };
}
