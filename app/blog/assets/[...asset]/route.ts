import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getPostBySlug } from "@/lib/blog";
import {
  getSafePostAssetFilePath,
  getSlugFromSegments,
} from "@/lib/blog/assets";

type BlogAssetRouteContext = {
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

export async function GET(_request: Request, { params }: BlogAssetRouteContext) {
  const { asset } = await params;
  const maxPostDepth = Math.min(2, asset.length - 1);

  for (let postDepth = maxPostDepth; postDepth >= 1; postDepth -= 1) {
    const slugSegments = asset.slice(0, postDepth);
    const assetSegments = asset.slice(postDepth);
    const filePath = await getSafePostAssetFilePath(slugSegments, assetSegments);

    if (!filePath) {
      continue;
    }

    const post = await getPostBySlug(getSlugFromSegments(slugSegments));

    if (!post?.published) {
      continue;
    }

    try {
      const file = await fs.readFile(filePath);
      const contentType =
        contentTypes[path.extname(filePath).toLocaleLowerCase()] ?? "application/octet-stream";

      return new NextResponse(new Uint8Array(file), {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": contentType,
        },
      });
    } catch {
      continue;
    }
  }

  return new NextResponse("Not found", { status: 404 });
}
