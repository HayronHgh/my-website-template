export type SocialLink = {
  label: string;
  href: string;
  value: string;
};

export type ExperienceItem = {
  period: string;
  title: string;
  organization: string;
  description: string;
};

export type Profile = {
  name: string;
  role: string;
  location: string;
  heroTitle: string;
  heroDescription: string;
  summary: string[];
  skills: string[];
  experience: ExperienceItem[];
  values: string[];
  interests: string[];
  socialLinks: SocialLink[];
  featuredProjectSlugs: string[];
};
