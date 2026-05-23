import { describe, expect, it } from "vitest";
import {
  isSafeMarkdownUrl,
  sanitizeMarkdownUrl,
} from "@/lib/content/url-policy";

describe("markdown URL policy", () => {
  it("allows normal link protocols and safe relative paths", () => {
    expect(isSafeMarkdownUrl("https://example.com", "link")).toBe(true);
    expect(isSafeMarkdownUrl("mailto:hello@example.com", "link")).toBe(true);
    expect(isSafeMarkdownUrl("/blog/example", "link")).toBe(true);
    expect(isSafeMarkdownUrl("#section", "link")).toBe(true);
  });

  it("blocks dangerous link and image protocols", () => {
    expect(isSafeMarkdownUrl("javascript:alert(1)", "link")).toBe(false);
    expect(isSafeMarkdownUrl("data:text/html;base64,abc", "image")).toBe(false);
    expect(isSafeMarkdownUrl("//example.com/image.png", "image")).toBe(false);
    expect(sanitizeMarkdownUrl("javascript:alert(1)", "link")).toBe("#");
  });

  it("blocks traversal in relative paths", () => {
    expect(isSafeMarkdownUrl("../secret.png", "image")).toBe(false);
    expect(isSafeMarkdownUrl("images/../secret.png", "image")).toBe(false);
    expect(isSafeMarkdownUrl("images/safe.png", "image")).toBe(true);
  });
});
