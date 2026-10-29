import { loadAdminConfig } from "@/lib/admin/config";
import {
  AdminApiError,
  apiSuccess,
  toApiErrorResponse,
} from "@/lib/admin/http";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { requireRequestSession } from "@/lib/admin/session";
import { assertCmsWriteEnabled } from "@/lib/admin/write-policy";
import { workingCopies } from "@/lib/admin/working-copies";
export const runtime = "nodejs";
export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins))
      throw new AdminApiError(403, "invalid_origin", "來源未通過驗證。");
    assertCmsWriteEnabled(config);
    const { user } = requireRequestSession(
      request,
      ["admin", "editor"],
      config,
    );
    const size = Number(request.headers.get("content-length"));
    if (!Number.isFinite(size) || size > 101 * 1024 * 1024)
      throw new AdminApiError(413, "asset_too_large", "檔案過大。");
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File))
      throw new AdminApiError(400, "missing_file", "請選擇媒體。");
    return apiSuccess(
      await workingCopies.uploadMedia((await context.params).id, file, user),
    );
  } catch (e) {
    return toApiErrorResponse(e);
  }
}
