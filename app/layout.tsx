import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { RouteImagePreloader } from "@/components/performance/route-image-preloader";
import { siteProfile } from "@/data/site";
import { siteConfig } from "@/lib/env";
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

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
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
    url: siteConfig.url,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hant">
      <body
        className={`${manrope.variable} ${jetbrainsMono.variable} antialiased`}
      >
        <RouteImagePreloader />
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
