import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { RouteImagePreloader } from "@/components/performance/route-image-preloader";
import { getSiteSettings } from "@/lib/site/settings";
import "katex/dist/katex.min.css";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata(): Promise<Metadata> {
  const { siteProfile, siteUrl } = await getSiteSettings();

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: `${siteProfile.brandName} | ${siteProfile.role}`,
      template: `%s | ${siteProfile.brandName}`,
    },
    description: siteProfile.positioning,
    applicationName: siteProfile.brandName,
    keywords: [
      "Software Engineer",
      "Next.js",
      "TypeScript",
      "React",
      "Technical Blog",
      "Portfolio",
    ],
    openGraph: {
      title: `${siteProfile.brandName} | ${siteProfile.role}`,
      description: siteProfile.positioning,
      url: siteUrl,
      siteName: siteProfile.brandName,
      locale: "zh_TW",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${siteProfile.brandName} | ${siteProfile.role}`,
      description: siteProfile.positioning,
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { contactLinks, navigationItems, routeImageMap, siteProfile } =
    await getSiteSettings();
  const routeImagePreloads = routeImageMap.map((item) => item.src);

  return (
    <html lang="zh-Hant">
      <body
        className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <RouteImagePreloader images={routeImagePreloads} />
        <div className="flex min-h-screen flex-col">
          <Navbar
            brandName={siteProfile.brandName}
            navigationItems={navigationItems}
            role={siteProfile.role}
            routeImageMap={routeImageMap}
          />
          <main className="flex-1">{children}</main>
          <Footer contactLinks={contactLinks} siteProfile={siteProfile} />
        </div>
      </body>
    </html>
  );
}
