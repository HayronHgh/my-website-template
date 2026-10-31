import { expect, it } from "vitest";
import { defaultFocus, focusSchema } from "@/lib/site/focus";

it("accepts optional links and rejects executable or external protocol-relative URLs", () => {
  for (const href of ["", "/research", "https://example.com/research"]) {
    expect(focusSchema.safeParse({ ...defaultFocus, items: [{ ...defaultFocus.items[0], href }] }).success).toBe(true);
  }
  for (const href of ["javascript:alert(1)", "//example.com", "/\\example.com", "data:text/html,test"]) {
    expect(focusSchema.safeParse({ ...defaultFocus, items: [{ ...defaultFocus.items[0], href }] }).success).toBe(false);
  }
});
