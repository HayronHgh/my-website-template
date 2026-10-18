import { mkdtemp, mkdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { AdminApiError } from "@/lib/admin/http";
import {
  createPracticePlanStore,
  seededPracticePlanItems,
} from "@/lib/leetcode/practice-plan";

async function makeStore() {
  const root = await mkdtemp(path.join(os.tmpdir(), "leetcode-plan-"));
  const directory = path.join(root, "content", "leetcode");
  await mkdir(directory, { recursive: true });
  return {
    directory,
    store: createPracticePlanStore({
      directory,
      now: () => new Date("2026-10-18T08:00:00.000Z"),
    }),
  };
}

describe("LeetCode practice plan", () => {
  it("seeds the verified advanced 50 order with problem 100 complete", async () => {
    const { store } = await makeStore();
    const plan = await store.read();

    expect(plan.items).toHaveLength(50);
    expect(plan.items[0]).toMatchObject({ completed: true, id: 100, round: "第一輪" });
    expect(plan.items[1]).toMatchObject({ completed: false, id: 101, title: "Symmetric Tree" });
    expect(plan.items.at(-1)).toMatchObject({ id: 239, round: "第五輪" });
    expect(plan.updatedAt).toBeNull();
  });

  it("persists completion and ordering with a new revision", async () => {
    const { directory, store } = await makeStore();
    const initial = await store.read();
    const items = initial.items.map((item) =>
      item.id === 101
        ? { ...item, completed: true, completedAt: "2026-10-18T08:00:00.000Z" }
        : item,
    );
    [items[1], items[2]] = [items[2], items[1]];

    const saved = await store.update({ items, revision: initial.revision });
    const reloaded = await store.read();

    expect(saved.revision).not.toBe(initial.revision);
    expect(reloaded.items[1].id).toBe(110);
    expect(reloaded.items.find((item) => item.id === 101)?.completed).toBe(true);
    expect(JSON.parse(await readFile(path.join(directory, "practice-plan.json"), "utf8"))).toMatchObject({
      updatedAt: "2026-10-18T08:00:00.000Z",
      version: 1,
    });
  });

  it("rejects a stale revision without overwriting the saved plan", async () => {
    const { store } = await makeStore();
    const initial = await store.read();
    await store.update({ items: initial.items, revision: initial.revision });

    await expect(
      store.update({ items: seededPracticePlanItems, revision: initial.revision }),
    ).rejects.toMatchObject({ code: "revision_conflict", status: 409 } satisfies Partial<AdminApiError>);
  });
});
