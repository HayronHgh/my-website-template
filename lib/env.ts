const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const env = {
  siteName: process.env.NEXT_PUBLIC_SITE_NAME || "PortfolioKit",
  siteUrl: trimTrailingSlash(
    process.env.NEXT_PUBLIC_SITE_URL || "https://portfolio.example.com",
  ),
  contactEmail:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hello@example.com",
};

export const siteConfig = {
  name: env.siteName,
  url: env.siteUrl,
  description:
    "A file-driven portfolio template built with Next.js, TypeScript, local markdown, and a pixel-night interface.",
};

export function absoluteUrl(pathname = "/") {
  return new URL(pathname, `${siteConfig.url}/`).toString();
}
