import { describe, expect, it } from "vitest";
import { getResponsiveImageProperties } from "@/lib/content/responsive-images";
import { markdownToHtml } from "@/lib/blog/markdown";

const src = "/projects/assets/local-erp-workflow/assets/demo-hd/ledger.012345abcdef.webp";
const title = "responsive;width=3200;height=2000;variants=800,1600,2000";

describe("responsive content screenshots", () => {
  it("uses pre-generated local variants and reserves the intrinsic aspect ratio", () => {
    expect(getResponsiveImageProperties(src, title)).toMatchObject({
      src: src.replace(".webp", "-1600.webp"), width: 3200, height: 2000,
    });
    expect(getResponsiveImageProperties(src, title)?.srcSet).toContain(`${src} 3200w`);
    expect(getResponsiveImageProperties(src, title)?.srcSet).toContain("-800.webp 800w");
  });

  it.each([
    ["https://example.com/a.webp", title],
    ["/projects/assets/demo/../private/a.webp", title],
    [src, "responsive;width=3200;height=0;variants=800,1600"],
    [src, "responsive;width=3200;height=2000;variants=1600,800"],
    [src, "responsive;width=3200;height=2000;variants=800,3200"],
    [src, "ordinary image title"],
  ])("does not interpret unsafe or malformed opt-in metadata: %s", (url, metadata) => {
    expect(getResponsiveImageProperties(url, metadata)).toBeNull();
  });

  it("emits native srcset after sanitization with lazy loading and async decoding", async () => {
    const html = await markdownToHtml(`![Ledger](${src} "${title}")`);
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('srcset="');
    expect(html).toContain('width="3200" height="2000"');
    expect(html).not.toContain("responsive;width");
  });

  it("retains alt text, ordinary titles, links and existing editor sizing", async () => {
    const html = await markdownToHtml(`[![Ledger](${src} "Original title")](${src})`);
    expect(html).toContain('alt="Ledger"');
    expect(html).toContain('title="Original title"');
    expect(html).toContain(`<a href="${src}">`);
    expect(html).not.toContain('srcset="');
    const sized = await markdownToHtml(`![Ledger](${src} "media;width=560;aspect=4:3")`);
    expect(sized).toContain("--media-width:560px");
  });
});
