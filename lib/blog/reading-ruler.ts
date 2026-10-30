export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function readingProgress(scroll: number, start: number, end: number) {
    return end <= start ? 0 : clamp((scroll - start) / (end - start), 0, 1);
}
/** Slow movement stays precise; a deliberate flick covers more of the article. */
export function rulerDragStep(delta: number, elapsedMs: number) {
    const speed = Math.abs(delta) / Math.max(8, elapsedMs);
    return delta * (2 + Math.min(8, speed * 3));
}
/** Time based decay gives the same release feel on 60 Hz and 120 Hz displays. */
export function rulerCoastStep(velocity: number, elapsedMs: number) {
    const decay = Math.exp(-Math.max(0, elapsedMs) / 180);
    return { delta: velocity * 180 * (1 - decay), velocity: velocity * decay };
}
