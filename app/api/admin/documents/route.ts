import { z } from "zod";
import { loadAdminConfig } from "@/lib/admin/config";
import { requireRequestSession } from "@/lib/admin/session";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { assertCmsWriteEnabled } from "@/lib/admin/write-policy";
import { AdminApiError, apiSuccess, toApiErrorResponse, readJsonBody } from "@/lib/admin/http";
import { readDocument, updateDocument } from "@/lib/admin/documents";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    requireRequestSession(request);
    return apiSuccess(await readDocument(new URL(request.url).searchParams.get("key") ?? ""));
  } catch (error) { return toApiErrorResponse(error); }
}
export async function PUT(request: Request) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins)) throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    requireRequestSession(request, ["admin"], config);
    assertCmsWriteEnabled(config);
    const body = await readJsonBody(request, z.object({ key: z.string().max(200), data: z.unknown(), revision: z.string().regex(/^[a-f0-9]{64}$/) }).strict());
    return apiSuccess(await updateDocument(body.key, body.data, body.revision));
  } catch (error) { return toApiErrorResponse(error); }
}
