export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function readingProgress(scroll: number, start: number, end: number) {
    return end <= start ? 0 : clamp((scroll - start) / (end - start), 0, 1);
}
/** One 48px detent advances one heading; a single event cannot skip headings. */
export function rulerDetent(offset: number, delta: number, index: number, count: number) {
    const distance = offset + delta;
    if (Math.abs(distance) < 48) return { offset: distance, index };
    return { offset: 0, index: clamp(index + Math.sign(distance), 0, Math.max(0, count - 1)) };
}
