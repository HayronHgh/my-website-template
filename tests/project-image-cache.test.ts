import { promises as fs } from "node:fs";
import path from "node:path";
import { expect, it } from "vitest";
import { GET } from "@/app/projects/assets/[...asset]/route";

it("caches only fingerprinted project images and preserves range responses", async () => {
  const slug = `image-cache-test-${process.pid}-${Date.now()}`;
  const directory = path.join(process.cwd(), "content/projects", slug);
  await fs.mkdir(directory, { recursive: true });
  try {
    for (const name of ["screen.012345abcdef-1600.webp", "mutable.webp"]) {
      await fs.writeFile(path.join(directory, name), "fixture bytes");
      const response = await GET(new Request(`https://example.test/projects/assets/${slug}/${name}`, {
        headers: { range: "bytes=0-3" },
      }), { params: Promise.resolve({ asset: [slug, name] }) });
      expect(response.status).toBe(206);
      expect(response.headers.get("cache-control")).toBe(name === "mutable.webp" ? "no-store" : "public, max-age=31536000, immutable");
      expect(await response.text()).toBe("fixt");
    }
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
