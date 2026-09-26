import { loadAdminConfig } from "@/lib/admin/config";
import { AdminApiError, apiSuccess, toApiErrorResponse } from "@/lib/admin/http";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { saveResearchMedia } from "@/lib/admin/research-media";
import { requireRequestSession } from "@/lib/admin/session";
import { assertCmsWriteEnabled } from "@/lib/admin/write-policy";
export const runtime = "nodejs"; export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins)) throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    requireRequestSession(request, ["admin", "editor"], config); assertCmsWriteEnabled(config);
    const length = Number(request.headers.get("content-length") ?? 0);
    if (!Number.isFinite(length) || length > 101 * 1024 * 1024) throw new AdminApiError(413, "request_too_large", "上傳檔案過大。");
    const form = await request.formData(); const file = form.get("file"); const slug = String(form.get("slug") ?? "");
    if (!(file instanceof File)) throw new AdminApiError(422, "missing_file", "請選擇檔案。");
    return apiSuccess(await saveResearchMedia(slug, file), { status: 201 });
  } catch (error) { return toApiErrorResponse(error); }
}
