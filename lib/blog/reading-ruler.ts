export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export function readingProgress(scroll: number, start: number, end: number) {
    return end <= start ? 0 : clamp((scroll - start) / (end - start), 0, 1);
}
/** A fixed, slightly slower than 1:1 ratio prevents flicks from skipping sections. */
export function rulerDragStep(delta: number) {
    return delta * 0.85;
}
/** Time based decay gives the same release feel on 60 Hz and 120 Hz displays. */
export function rulerCoastStep(velocity: number, elapsedMs: number) {
    const decay = Math.exp(-Math.max(0, elapsedMs) / 90);
    return { delta: velocity * 90 * (1 - decay), velocity: velocity * decay };
}
