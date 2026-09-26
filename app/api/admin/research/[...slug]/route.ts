import { loadAdminConfig } from "@/lib/admin/config";
import { assertSafeArticleRoutePath } from "@/lib/admin/articles/slug";
import { AdminApiError, apiSuccess, readJsonBody, toApiErrorResponse } from "@/lib/admin/http";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { requireRequestSession } from "@/lib/admin/session";
import { assertCmsWriteEnabled } from "@/lib/admin/write-policy";
import { updateResearchRequestSchema } from "@/lib/research/requests";
import { researchStore } from "@/lib/research/store";

type Context = { params: Promise<{ slug: string[] }> };
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request, { params }: Context) {
  try {
    const config = loadAdminConfig();
    requireRequestSession(request, ["admin", "editor"], config);
    assertSafeArticleRoutePath(request, "/api/admin/research/");
    const { slug } = await params;
    const requestedViews = new URL(request.url).searchParams.getAll("view");
    if (requestedViews.length > 1 || (requestedViews.length === 1 && requestedViews[0] !== "revision")) {
      throw new AdminApiError(400, "invalid_view", "不支援這個文章檢視模式。");
    }
    return requestedViews[0] === "revision"
      ? apiSuccess(await researchStore.readRevision(slug))
      : apiSuccess({ article: await researchStore.read(slug) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PUT(request: Request, { params }: Context) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins)) {
      throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    }
    const session = requireRequestSession(request, ["admin", "editor"], config);
    assertCmsWriteEnabled(config);
    assertSafeArticleRoutePath(request, "/api/admin/research/");
    const body = await readJsonBody(request, updateResearchRequestSchema);
    const { saveMode, ...input } = body;
    return apiSuccess({ article: await researchStore.update((await params).slug, input, session.user.role, saveMode) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins)) {
      throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    }
    const session = requireRequestSession(request, ["admin"], config);
    assertCmsWriteEnabled(config);
    assertSafeArticleRoutePath(request, "/api/admin/research/");
    return apiSuccess({ archive: await researchStore.archive((await params).slug, session.user.role) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
