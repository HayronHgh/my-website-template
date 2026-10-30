import { describe, expect, it } from "vitest";
import { readingProgress, rulerCoastStep, rulerDragStep } from "@/lib/blog/reading-ruler";
describe("reading ruler gestures", () => {
    it("bounds reading progress to the article rather than the footer", () => {
        expect(readingProgress(0, 400, 2400)).toBe(0);
        expect(readingProgress(1400, 400, 2400)).toBe(.5);
        expect(readingProgress(3000, 400, 2400)).toBe(1);
        expect(readingProgress(0, 0, 0)).toBe(0);
    });
    it("allows precise slow movement and bounded acceleration in both directions", () => {
        const slow = rulerDragStep(4, 50);
        const flick = rulerDragStep(4, 8);
        expect(slow).toBeGreaterThan(4);
        expect(flick).toBeGreaterThan(slow);
        expect(rulerDragStep(-4, 8)).toBe(-flick);
        expect(rulerDragStep(100, 0)).toBe(1000);
        expect(rulerDragStep(0, 0)).toBe(0);
    });
    it("decays release momentum independently of display refresh rate", () => {
        const whole = rulerCoastStep(2, 32);
        const first = rulerCoastStep(2, 16);
        const second = rulerCoastStep(first.velocity, 16);
        expect(first.delta + second.delta).toBeCloseTo(whole.delta, 8);
        expect(second.velocity).toBeCloseTo(whole.velocity, 8);
        expect(rulerCoastStep(-2, 32).delta).toBe(-whole.delta);
        expect(rulerCoastStep(2, 1800).velocity).toBeLessThan(.001);
    });
});
