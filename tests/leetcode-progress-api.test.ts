import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/http";

const mocks = vi.hoisted(() => ({ read: vi.fn(), update: vi.fn(), session: vi.fn() }));
vi.mock("@/lib/admin/config", () => ({ loadAdminConfig: () => ({ allowedOrigins: new Set(), writeEnabled: true }) }));
vi.mock("@/lib/admin/session", () => ({ requireRequestSession: mocks.session }));
vi.mock("@/lib/leetcode/store", () => ({ problemStore: { read: mocks.read, update: mocks.update } }));

import { PATCH } from "@/app/api/admin/leetcode/[...slug]/route";

const origin = "http://localhost:3000";
const revision = "a".repeat(64);
const article = {
  content: "## Existing solution\n\n![diagram](assets/image.png)\n",
  date: "2026-10-18",
  description: "Existing summary",
  problem: { id: 100, difficulty: "Easy", status: "Attempted", language: "Python", format: "legacy", entryType: "problem" },
  published: false,
  revision,
  slug: "100-same-tree",
  tags: ["tree"],
  title: "Same Tree",
};
function request(body: unknown, requestOrigin = origin) {
  return new Request(`${origin}/api/admin/leetcode/100-same-tree`, {
    method: "PATCH",
    headers: { origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const context = () => ({ params: Promise.resolve({ slug: ["100-same-tree"] }) });

beforeEach(() => {
  vi.clearAllMocks();
  mocks.session.mockReturnValue({ user: { role: "admin" } });
  mocks.read.mockResolvedValue(article);
  mocks.update.mockResolvedValue({ ...article, problem: { ...article.problem, status: "Review" } });
});

describe("LeetCode quick progress API", () => {
  it("updates only progress while preserving the article and caller revision", async () => {
    const response = await PATCH(request({ revision, status: "Review" }), context());
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(["100-same-tree"], {
      content: article.content, date: article.date, description: article.description,
      problem: { ...article.problem, status: "Review" }, published: false,
      revision, tags: article.tags, title: article.title,
    }, "admin", "manual");
  });

  it("rejects cross-origin requests before reading articles", async () => {
    expect((await PATCH(request({ revision, status: "Solved" }, "https://other.example"), context())).status).toBe(403);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("requires an authenticated session", async () => {
    mocks.session.mockImplementation(() => { throw new AdminApiError(401, "unauthorized", "請登入"); });
    expect((await PATCH(request({ revision, status: "Solved" }), context())).status).toBe(401);
    expect(mocks.read).not.toHaveBeenCalled();
  });

  it("does not permit changing article text through a progress request", async () => {
    expect((await PATCH(request({ revision, status: "Solved", content: "replacement" }), context())).status).toBe(422);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("returns revision conflicts instead of retrying with a newer revision", async () => {
    mocks.update.mockRejectedValue(new AdminApiError(409, "revision_conflict", "文章已更新"));
    expect((await PATCH(request({ revision, status: "Solved" }), context())).status).toBe(409);
    expect(mocks.update).toHaveBeenCalledTimes(1);
  });

  it("does not attach a progress status to a learning note", async () => {
    mocks.read.mockResolvedValue({ ...article, problem: { ...article.problem, id: null, entryType: "note" } });
    expect((await PATCH(request({ revision, status: "Solved" }), context())).status).toBe(422);
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
