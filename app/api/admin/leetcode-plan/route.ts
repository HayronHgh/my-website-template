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
import { problemStore } from "@/lib/leetcode/store";
import {
  practicePlanStore,
  updatePracticePlanSchema,
  type PracticePlan,
} from "@/lib/leetcode/practice-plan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function withArticleState(plan: PracticePlan) {
  const articles = await problemStore.list({ query: "", status: "all" });
  const byProblemId = new Map<number, (typeof articles)[number]>();

  for (const article of articles) {
    const id = article.problem?.id;
    if (id && article.problem?.entryType !== "note" && !byProblemId.has(id)) {
      byProblemId.set(id, article);
    }
  }

  return {
    ...plan,
    items: plan.items.map((item) => {
      const article = byProblemId.get(item.id);
      return {
        ...item,
        article: article
          ? {
              published: article.published,
              slug: article.slug,
              status: article.problem?.status ?? null,
            }
          : null,
      };
    }),
  };
}

export async function GET(request: Request) {
  try {
    const config = loadAdminConfig();
    requireRequestSession(request, ["admin", "editor"], config);
    return apiSuccess({ plan: await withArticleState(await practicePlanStore.read()) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const config = loadAdminConfig();
    if (!isSameOriginRequest(request, config.allowedOrigins)) {
      throw new AdminApiError(403, "invalid_origin", "要求來源未通過驗證。");
    }

    requireRequestSession(request, ["admin", "editor"], config);
    assertCmsWriteEnabled(config);
    const input = await readJsonBody(request, updatePracticePlanSchema);
    return apiSuccess({ plan: await withArticleState(await practicePlanStore.update(input)) });
  } catch (error) {
    return toApiErrorResponse(error);
  }
}
