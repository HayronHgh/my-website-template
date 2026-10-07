import { z } from "zod";
import { loadAdminConfig } from "@/lib/admin/config";
import { archiveProject } from "@/lib/admin/projects";
import { AdminApiError, apiSuccess, readJsonBody, toApiErrorResponse } from "@/lib/admin/http";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { requireRequestSession } from "@/lib/admin/session";
import { assertCmsWriteEnabled } from "@/lib/admin/write-policy";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins)) {
      throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    }
    requireRequestSession(request, ["admin"], config);
    assertCmsWriteEnabled(config);
    const { revision } = await readJsonBody(request, z.object({
      revision: z.string().regex(/^[a-f0-9]{64}$/),
    }).strict());
    return apiSuccess({ archive: await archiveProject((await params).slug, revision) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
