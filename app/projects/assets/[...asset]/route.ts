import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { createAssetFileResponse } from "@/lib/content/asset-response";
import { getProjectAssetFilePath } from "@/lib/projects/assets";

type ProjectAssetRouteContext = {
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
  ".mp4": "video/mp4",
};

export async function GET(request: Request, { params }: ProjectAssetRouteContext) {
  const { asset } = await params;
  const [slug, ...assetSegments] = asset;
  const filePath = slug ? getProjectAssetFilePath(slug, assetSegments) : null;

  if (!filePath) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const stats = await fs.stat(filePath);
    const contentType =
      contentTypes[path.extname(filePath).toLocaleLowerCase()] ?? "application/octet-stream";

    return createAssetFileResponse({
      cacheControl: "no-store",
      contentType,
      filePath,
      request,
      stats,
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
