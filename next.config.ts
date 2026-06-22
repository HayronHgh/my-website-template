import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    localPatterns: [
      { pathname: "/site/assets/**" },
      { pathname: "/blog/assets/**" },
    ],
    formats: ["image/avif", "image/webp"],
    qualities: [60, 70, 75, 80],
    deviceSizes: [640, 750, 828, 1080, 1200, 1500, 1920],
    imageSizes: [32, 48, 64, 96, 128, 256, 384, 640],
    minimumCacheTTL: 31536000,
  },
  output: "standalone",
  poweredByHeader: false,
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
