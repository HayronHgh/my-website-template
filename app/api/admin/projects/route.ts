import { z } from "zod";
import { loadAdminConfig } from "@/lib/admin/config";
import { createProject } from "@/lib/admin/projects";
import { AdminApiError, readJsonBody, apiSuccess, toApiErrorResponse } from "@/lib/admin/http";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { requireRequestSession } from "@/lib/admin/session";
import { assertCmsWriteEnabled } from "@/lib/admin/write-policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const schema = z.object({ slug: z.string().trim().max(80), title: z.string().trim().min(1).max(120) }).strict();
export async function POST(request: Request) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins)) throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    requireRequestSession(request, ["admin"], config); assertCmsWriteEnabled(config);
    const body = await readJsonBody(request, schema);
    return apiSuccess(await createProject(body.slug, body.title), { status: 201 });
  } catch (error) { return toApiErrorResponse(error); }
}
