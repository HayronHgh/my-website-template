import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { loadAdminConfig } from "@/lib/admin/config";
import { toApiErrorResponse } from "@/lib/admin/http";
import { requireRequestSession } from "@/lib/admin/session";
import { getSafePostAssetFilePath } from "@/lib/blog/assets";
import { createAssetFileResponse } from "@/lib/content/asset-response";

type AdminMediaRouteContext = {
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
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

export async function GET(request: Request, { params }: AdminMediaRouteContext) {
  try {
    const config = loadAdminConfig();
    requireRequestSession(request, ["admin", "editor"], config);

    const { asset } = await params;
    const requestedVersion = new URL(request.url).searchParams.get("v");
    const maxPostDepth = Math.min(2, asset.length - 1);

    for (let postDepth = maxPostDepth; postDepth >= 1; postDepth -= 1) {
      const filePath = await getSafePostAssetFilePath(
        asset.slice(0, postDepth),
        asset.slice(postDepth),
      );

      if (!filePath) {
        continue;
      }

      try {
        const stats = await fs.stat(filePath);
        const currentVersion = `${Math.trunc(stats.mtimeMs)}-${stats.size}`;

        if (requestedVersion && requestedVersion !== currentVersion) {
          return new NextResponse("Not found", {
            headers: { "Cache-Control": "no-store" },
            status: 404,
          });
        }

        const contentType =
          contentTypes[path.extname(filePath).toLocaleLowerCase()] ??
          "application/octet-stream";

        return createAssetFileResponse({
          cacheControl: "private, no-store",
          contentType,
          filePath,
          request,
          stats,
        });
      } catch {
        continue;
      }
    }

    return new NextResponse("Not found", {
      headers: { "Cache-Control": "no-store" },
      status: 404,
    });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
