import { z } from "zod";
import { loadAdminConfig } from "@/lib/admin/config";
import { AdminApiError, apiSuccess, readJsonBody, toApiErrorResponse } from "@/lib/admin/http";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { requireRequestSession } from "@/lib/admin/session";
import { getAdminArticleMediaUrl } from "@/lib/admin/media";
import { markdownToHtml } from "@/lib/blog/markdown";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const schema = z.object({ blocks: z.array(z.string().max(100000)).max(300), slug: z.string().max(320) }).strict();
export async function POST(request: Request) {
  try {
    const config = loadAdminConfig(); if (!isSameOriginRequest(request, config.allowedOrigins)) throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    requireRequestSession(request, ["admin", "editor"], config); const body = await readJsonBody(request, schema);
    return apiSuccess({
      html: await Promise.all(
        body.blocks.map((block) =>
          markdownToHtml(
            block,
            body.slug
              ? {
                  resolveAssetUrl: (assetPath) =>
                    getAdminArticleMediaUrl(body.slug, assetPath),
                }
              : {},
          ),
        ),
      ),
    });
  } catch (error) { return toApiErrorResponse(error); }
}
