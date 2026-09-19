import { z } from "zod";
import { loadAdminConfig } from "@/lib/admin/config";
import { apiSuccess, readJsonBody, toApiErrorResponse } from "@/lib/admin/http";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { requireRequestSession } from "@/lib/admin/session";
import { AdminApiError } from "@/lib/admin/http";
import { markdownToHtml } from "@/lib/blog/markdown";
import { getProjectAssetUrl } from "@/lib/projects/assets";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
const schema = z.object({ blocks: z.array(z.string().max(100000)).max(300), slug: z.string().optional() }).strict();
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins)) throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    requireRequestSession(request, ["admin", "editor"], config);
    const { blocks } = await readJsonBody(request, schema);
    const { slug } = await context.params;
    const html = await Promise.all(blocks.map((block) => markdownToHtml(block, { resolveAssetUrl: (asset) => getProjectAssetUrl(slug, asset) })));
    return apiSuccess({ html });
  } catch (error) { return toApiErrorResponse(error); }
}
