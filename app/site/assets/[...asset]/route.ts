import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getSafeSiteAssetFilePath } from "@/lib/site/assets";

type SiteAssetRouteContext = {
  params: Promise<{
    asset: string[];
  }>;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET(request: Request, { params }: SiteAssetRouteContext) {
  const { asset } = await params;
  const filePath = await getSafeSiteAssetFilePath(asset);

  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const stats = await fs.stat(filePath);
    const currentVersion = `${Math.trunc(stats.mtimeMs)}-${stats.size}`;
    const requestedVersion = new URL(request.url).searchParams.get("v");

    if (requestedVersion && requestedVersion !== currentVersion) {
      return new NextResponse("Not found", {
        status: 404,
        headers: {
          "Cache-Control": "no-store",
        },
      });
    }

    const file = await fs.readFile(filePath);
    const contentType =
      contentTypes[path.extname(filePath).toLocaleLowerCase()] ?? "application/octet-stream";
    const isCanonicalVersion = requestedVersion === currentVersion;

    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Cache-Control": isCanonicalVersion
          ? "public, max-age=31536000, immutable"
          : "public, max-age=3600, stale-while-revalidate=86400",
        "Content-Length": String(stats.size),
        "Content-Type": contentType,
        "Last-Modified": stats.mtime.toUTCString(),
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
