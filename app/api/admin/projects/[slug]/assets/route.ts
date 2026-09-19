import { loadAdminConfig } from "@/lib/admin/config";
import { AdminApiError, apiSuccess, toApiErrorResponse } from "@/lib/admin/http";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { saveProjectAsset } from "@/lib/admin/projects";
import { requireRequestSession } from "@/lib/admin/session";
import { assertCmsWriteEnabled } from "@/lib/admin/write-policy";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_REQUEST_BYTES = 101 * 1024 * 1024;
export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins)) throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    requireRequestSession(request, ["admin"], config); assertCmsWriteEnabled(config);
    const length = Number(request.headers.get("content-length") ?? 0);
    if (!Number.isFinite(length) || length > MAX_REQUEST_BYTES) throw new AdminApiError(413, "request_too_large", "上傳檔案過大。");
    const form = await request.formData();
    const file = form.get("file");
    const purpose = form.get("purpose") === "cover" ? "cover" : "media";
    if (!(file instanceof File)) throw new AdminApiError(422, "missing_file", "請選擇檔案。");
    const { slug } = await context.params;
    return apiSuccess(await saveProjectAsset(slug, file, purpose), { status: 201 });
  } catch (error) { return toApiErrorResponse(error); }
}
