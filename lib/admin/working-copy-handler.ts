import { z } from "zod";
import { loadAdminConfig } from "@/lib/admin/config";
import {
  AdminApiError,
  apiSuccess,
  readJsonBody,
  toApiErrorResponse,
} from "@/lib/admin/http";
import { isSameOriginRequest } from "@/lib/admin/origin";
import { requireRequestSession } from "@/lib/admin/session";
import { assertCmsWriteEnabled } from "@/lib/admin/write-policy";
import {
  domainSchema,
  workingCopies,
  workingOpen,
  workingUpdate,
} from "@/lib/admin/working-copies";
export async function handleWorkingCopy(
  request: Request,
  id?: string,
  publish = false,
) {
  try {
    const config = loadAdminConfig();
    if (request.method !== "GET") {
      if (!isSameOriginRequest(request, config.allowedOrigins))
        throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
      assertCmsWriteEnabled(config);
    }
    const { user } = requireRequestSession(
      request,
      ["admin", "editor"],
      config,
    );
    if (request.method === "GET") {
      if (id) return apiSuccess({ copy: await workingCopies.read(id, user) });
      const domain = domainSchema.safeParse(
        new URL(request.url).searchParams.get("domain"),
      );
      if (!domain.success)
        throw new AdminApiError(400, "invalid_domain", "內容分區不正確。");
      return apiSuccess({
        copies: (await workingCopies.list(domain.data, user)).map((copy) => ({
          id: copy.id,
          domain: copy.domain,
          slug: copy.slug,
          updatedAt: copy.updatedAt,
          fields: {
            title: copy.fields.title,
            published: copy.fields.published,
          },
        })),
      });
    }
    if (request.method === "POST" && !id) {
      const input = await readJsonBody(request, workingOpen);
      return apiSuccess(
        { copy: await workingCopies.open(input.domain, input.slug, user) },
        { status: 201 },
      );
    }
    if (request.method === "PUT" && id)
      return apiSuccess({
        copy: await workingCopies.update(
          id,
          await readJsonBody(request, workingUpdate),
          user,
        ),
      });
    if (id && (publish || request.method === "DELETE")) {
      const { revision } = await readJsonBody(
        request,
        z.object({ revision: z.string().uuid() }).strict(),
      );
      if (publish)
        return apiSuccess(await workingCopies.publish(id, revision, user));
      await workingCopies.discard(id, revision, user);
      return apiSuccess({ discarded: true });
    }
    throw new AdminApiError(405, "method_not_allowed", "不支援這個操作。");
  } catch (e) {
    return toApiErrorResponse(e);
  }
}
