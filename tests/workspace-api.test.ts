import { afterEach, beforeAll, beforeEach, expect, it, vi } from "vitest";
import { POST as login } from "@/app/api/admin/auth/login/route";
import { GET as getDocument, PUT as putDocument } from "@/app/api/admin/documents/route";
import { GET as listProblems, POST as createProblem } from "@/app/api/admin/leetcode/route";
import { hashPassword } from "@/lib/admin/password";
import { resetLoginLimiterForTests } from "@/lib/admin/login-limiter";
const origin = "http://localhost:3000";
let hash = "";
beforeAll(async () => { hash = await hashPassword("workspace-test-password"); });
beforeEach(() => {
  vi.stubEnv("NODE_ENV", "test");
  vi.stubEnv("ADMIN_JWT_SECRET", "workspace-test-secret-at-least-thirty-two-bytes");
  vi.stubEnv("ADMIN_USERS_JSON", JSON.stringify([{ username:"editor", role:"editor", passwordHash:hash }]));
  resetLoginLimiterForTests();
});
afterEach(() => vi.unstubAllEnvs());
it("does not expose unpublished workspace content anonymously", async () => {
  expect((await getDocument(new Request(origin + "/api/admin/documents?key=resume/resume.json"))).status).toBe(401);
  expect((await listProblems(new Request(origin + "/api/admin/leetcode"))).status).toBe(401);
});
it("rejects cross-origin writes before touching content", async () => {
  for (const [method, handler, endpoint] of [["PUT",putDocument,"documents"],["POST",createProblem,"leetcode"]] as const) {
    expect((await handler(new Request(origin + "/api/admin/" + endpoint, { method, headers:{ origin:"https://attacker.example","content-type":"application/json" },body:"{}" }))).status).toBe(403);
  }
});
it("keeps project and resume mutations administrator-only", async () => {
  const response = await login(new Request(origin + "/api/admin/auth/login", { method:"POST", headers:{origin,"content-type":"application/json"}, body:JSON.stringify({username:"editor",password:"workspace-test-password"}) }));
  expect(response.status).toBe(200);
  const cookie = response.headers.get("set-cookie")!.split(";")[0];
  expect((await putDocument(new Request(origin + "/api/admin/documents", { method:"PUT", headers:{origin,cookie,"content-type":"application/json"},body:"{}" }))).status).toBe(403);
});
