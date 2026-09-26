import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { loadAdminConfig } from "@/lib/admin/config";
import { toApiErrorResponse } from "@/lib/admin/http";
import { requireRequestSession } from "@/lib/admin/session";
import { createAssetFileResponse } from "@/lib/content/asset-response";
import { getSafeResearchAssetPath } from "@/lib/research/assets";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const types: Record<string,string> = { ".avif":"image/avif", ".gif":"image/gif", ".jpeg":"image/jpeg", ".jpg":"image/jpeg", ".mp4":"video/mp4", ".png":"image/png", ".svg":"image/svg+xml", ".webp":"image/webp" };
export async function GET(request: Request, { params }: { params: Promise<{ asset: string[] }> }) {
  try {
    requireRequestSession(request, ["admin", "editor"], loadAdminConfig());
    const { asset } = await params;
    for (let depth = Math.min(2, asset.length - 1); depth >= 1; depth -= 1) {
      const filePath = await getSafeResearchAssetPath(asset.slice(0, depth), asset.slice(depth));
      if (!filePath) continue;
      const stats = await fs.stat(filePath);
      return createAssetFileResponse({ cacheControl:"private, no-store", contentType:types[path.extname(filePath).toLowerCase()] ?? "application/octet-stream", filePath, request, stats });
    }
    return new NextResponse("Not found", { status:404, headers:{ "Cache-Control":"no-store" } });
  } catch (error) { return toApiErrorResponse(error); }
}
