import { afterEach, expect, it, vi } from "vitest";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { defaultFocus, focusSchema } from "@/lib/site/focus";
import { readDocument, updateDocument } from "@/lib/admin/documents";

afterEach(() => vi.restoreAllMocks());

it("accepts optional links and rejects executable or external protocol-relative URLs", () => {
  for (const href of ["", "/research", "https://example.com/research"]) {
    expect(focusSchema.safeParse({ ...defaultFocus, items: [{ ...defaultFocus.items[0], href }] }).success).toBe(true);
  }
  for (const href of ["javascript:alert(1)", "//example.com", "/\\example.com", "data:text/html,test"]) {
    expect(focusSchema.safeParse({ ...defaultFocus, items: [{ ...defaultFocus.items[0], href }] }).success).toBe(false);
  }
});

it("persists Focus ordering and visibility and rejects stale saves without changing other settings", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "focus-test-"));
  try {
    await fs.mkdir(path.join(root, "content/site"), { recursive:true });
    await fs.writeFile(path.join(root, "content/site/focus.json"), JSON.stringify(defaultFocus));
    await fs.writeFile(path.join(root, "content/site/site.json"), '{"brandName":"Existing"}');
    vi.spyOn(process, "cwd").mockReturnValue(root);
    const original = await readDocument("site/focus.json");
    const data = { ...defaultFocus, items: [...defaultFocus.items].reverse().map((item,index) => ({ ...item, enabled:index !== 1 })) };
    const updated = await updateDocument(original.key, data, original.revision);
    expect(updated.data).toEqual(data);
    await expect(updateDocument(original.key, defaultFocus, original.revision)).rejects.toMatchObject({ status:409 });
    expect(await fs.readFile(path.join(root,"content/site/site.json"),"utf8")).toBe('{"brandName":"Existing"}');
  } finally {
    vi.restoreAllMocks();
    await fs.rm(root, { recursive:true, force:true });
  }
});
