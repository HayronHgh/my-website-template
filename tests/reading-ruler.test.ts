import { describe, expect, it } from "vitest";
import { readingProgress, rulerCoastStep, rulerDragStep } from "@/lib/blog/reading-ruler";
describe("reading ruler gestures", () => {
    it("bounds reading progress to the article rather than the footer", () => {
        expect(readingProgress(0, 400, 2400)).toBe(0);
        expect(readingProgress(1400, 400, 2400)).toBe(.5);
        expect(readingProgress(3000, 400, 2400)).toBe(1);
        expect(readingProgress(0, 0, 0)).toBe(0);
    });
    it("keeps a 150px swipe below 150px of scrolling, regardless of event batching", () => {
        const single = rulerDragStep(150);
        const many = Array.from({ length: 30 }, () => rulerDragStep(5)).reduce((sum, step) => sum + step, 0);
        expect(single).toBeGreaterThan(100);
        expect(single).toBeLessThan(150);
        expect(many).toBeCloseTo(single, 8);
        expect(rulerDragStep(-150)).toBe(-single);
        expect(rulerDragStep(0)).toBe(0);
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
    it("limits the capped release to a short coast instead of another screen", () => {
        expect(rulerCoastStep(.6, 10000).delta).toBeLessThanOrEqual(54);
        expect(rulerCoastStep(-.6, 10000).delta).toBeGreaterThanOrEqual(-54);
        expect(rulerCoastStep(.6, 200).velocity).toBeLessThan(.08);
    });
});
