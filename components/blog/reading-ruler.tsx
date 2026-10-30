"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { clamp, readingProgress, rulerCoastStep, rulerDragStep } from "@/lib/blog/reading-ruler";
export type ReadingHeading = {
    id: string;
    title: string;
    depth: number;
};
type Gesture = {
    pointer: number;
    start: number;
    last: number;
    time: number;
    movedAt: number;
    velocity: number;
    active: boolean;
    moved: boolean;
};
export function ReadingRuler({ headings }: {
    headings: ReadingHeading[];
}) {
    const pathname = usePathname();
    const [position, setPosition] = useState({ progress: 0, current: "" });
    const [dragging, setDragging] = useState(false);
    const [open, setOpen] = useState(false);
    const root = useRef<HTMLDivElement>(null);
    const track = useRef<HTMLDivElement>(null);
    const menuButton = useRef<HTMLButtonElement>(null);
    const firstLink = useRef<HTMLAnchorElement>(null);
    const bounds = useRef({ start: 0, end: 0 });
    const gesture = useRef<Gesture | null>(null);
    const hold = useRef<ReturnType<typeof setTimeout> | null>(null);
    const coast = useRef(0);
    const reducedMotion = useRef(false);
    function stop() {
        cancelAnimationFrame(coast.current);
        if (hold.current)
            clearTimeout(hold.current);
        gesture.current = null;
        setDragging(false);
    }
    function move(delta: number) {
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const next = clamp(window.scrollY + delta, 0, Math.min(max, Math.max(bounds.current.end, window.scrollY)));
        window.scrollTo({ top: next, behavior: "instant" });
    }
    function release(velocity: number) {
        if (reducedMotion.current || Math.abs(velocity) < 0.08)
            return;
        let previous = performance.now();
        const frame = (time: number) => {
            const step = rulerCoastStep(velocity, Math.min(time - previous, 50));
            previous = time;
            velocity = step.velocity;
            const before = window.scrollY;
            move(step.delta);
            if (Math.abs(velocity) > 0.08 && Math.abs(window.scrollY - before) > 0.1)
                coast.current = requestAnimationFrame(frame);
        };
        coast.current = requestAnimationFrame(frame);
    }
    useEffect(() => {
        let scheduled = 0;
        const update = () => {
            scheduled = 0;
            const prose = document.querySelector<HTMLElement>("main .reading-prose");
            if (!prose)
                return;
            const rect = prose.getBoundingClientRect();
            const start = Math.max(0, rect.top + window.scrollY - 112);
            const end = Math.max(start, Math.min(document.documentElement.scrollHeight - innerHeight, rect.bottom + window.scrollY - innerHeight + 80));
            bounds.current = { start, end };
            const visible = headings.filter(h => (document.getElementById(h.id)?.getBoundingClientRect().top ?? Infinity) <= 160);
            const current = visible.at(-1)?.id ?? headings[0]?.id ?? "";
            setPosition({ progress: readingProgress(window.scrollY, start, end), current });
        };
        const schedule = () => { if (!scheduled)
            scheduled = requestAnimationFrame(update); };
        reducedMotion.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", schedule);
        const sizes = new ResizeObserver(schedule);
        sizes.observe(document.body);
        const wheel = (event: WheelEvent) => {
            event.preventDefault();
            stop();
            move(event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? innerHeight : 1));
        };
        const control = track.current;
        control?.addEventListener("wheel", wheel, { passive: false });
        const interrupt = () => stop();
        // A new page gesture always takes control back from inertia.
        document.addEventListener("pointerdown", interrupt, { capture: true });
        window.addEventListener("wheel", interrupt, { passive: true });
        window.addEventListener("blur", interrupt);
        window.addEventListener("keydown", interrupt);
        update();
        return () => {
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", schedule);
            control?.removeEventListener("wheel", wheel);
            document.removeEventListener("pointerdown", interrupt, { capture: true });
            window.removeEventListener("wheel", interrupt);
            window.removeEventListener("blur", interrupt);
            window.removeEventListener("keydown", interrupt);
            sizes.disconnect();
            cancelAnimationFrame(scheduled);
            cancelAnimationFrame(coast.current);
            if (hold.current)
                clearTimeout(hold.current);
            gesture.current = null;
        };
    }, [headings, pathname]);
    useEffect(() => {
        if (!open)
            return;
        firstLink.current?.focus({ preventScroll: true });
        const outside = (event: globalThis.PointerEvent) => {
            if (!root.current?.contains(event.target as Node))
                setOpen(false);
        };
        const escape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setOpen(false);
                menuButton.current?.focus({ preventScroll: true });
            }
        };
        document.addEventListener("pointerdown", outside);
        document.addEventListener("keydown", escape);
        return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
    }, [open]);
    function down(event: PointerEvent<HTMLDivElement>) {
        if (!event.isPrimary || event.button !== 0)
            return;
        stop();
        setOpen(false);
        event.currentTarget.setPointerCapture(event.pointerId);
        gesture.current = { pointer: event.pointerId, start: event.clientY, last: event.clientY, time: performance.now(), movedAt: 0, velocity: 0, active: false, moved: false };
        hold.current = setTimeout(() => {
            if (gesture.current) {
                gesture.current.active = true;
                setDragging(true);
            }
        }, 280);
    }
    function drag(event: PointerEvent<HTMLDivElement>) {
        const state = gesture.current;
        if (!state || state.pointer !== event.pointerId)
            return;
        const time = performance.now();
        if (Math.abs(event.clientY - state.start) > 5) {
            state.active = true;
            state.moved = true;
            setDragging(true);
        }
        if (!state.active)
            return;
        const elapsed = time - state.time;
        const delta = rulerDragStep(event.clientY - state.last, elapsed);
        move(delta);
        state.velocity = clamp(delta / Math.max(8, elapsed), -7, 7);
        state.last = event.clientY;
        state.time = time;
        state.movedAt = time;
    }
    function up(event: PointerEvent<HTMLDivElement>, cancelled = false) {
        const state = gesture.current;
        if (!state || state.pointer !== event.pointerId)
            return;
        const tapped = !state.active && !state.moved;
        const velocity = performance.now() - state.movedAt < 90 ? state.velocity : 0;
        stop();
        if (event.currentTarget.hasPointerCapture(event.pointerId))
            event.currentTarget.releasePointerCapture(event.pointerId);
        event.currentTarget.blur();
        if (cancelled)
            return;
        if (tapped)
            setOpen(!matchMedia("(max-width: 767px)").matches);
        else
            release(velocity);
    }
    const chapter = headings.find(h => h.id === position.current);
    const percent = Math.round(position.progress * 100);
    const chapterIndex = Math.max(0, headings.findIndex(h => h.id === position.current));
    return <div ref={root} className="reading-ruler" data-active={dragging || open || undefined} data-scrubbing={dragging || undefined}>
    {dragging && createPortal(<div className="reading-scrub-overlay" aria-hidden="true"><div className="reading-scrub-shade" /><div className="reading-scrub-guide"><div className="reading-scrub-meta"><span>章節導覽</span><span>{String(chapterIndex + 1).padStart(2, "0")} / {String(headings.length).padStart(2, "0")}</span></div><p className="reading-scrub-neighbor">{headings[chapterIndex - 1]?.title ?? "文章開始"}</p><div className="reading-scrub-current"><span className="reading-scrub-marker" /><h2>{chapter?.title ?? "閱讀進度"}</h2></div><p className="reading-scrub-neighbor reading-scrub-next">{headings[chapterIndex + 1]?.title ?? "文章結尾"}</p><div className="reading-scrub-footer"><span>上下拖曳 · 放開繼續閱讀</span><strong>{percent}<small>%</small></strong></div><div className="reading-scrub-progress"><i style={{ width: `${percent}%` }} /></div></div></div>, document.body)}
    <p id="reading-ruler-help" className="sr-only">按住上下拖曳閱讀，慢拖微調、快拖加速。方向鍵微調，Home 與 End 跳至文章兩端；手機長按放大章節導覽，桌面輕點開啟目錄。</p>
    {dragging && <output className="reading-ruler-hint">{chapter?.title ?? "閱讀進度"}<span>{percent}%</span></output>}
    <button ref={menuButton} type="button" className="reading-ruler-menu" aria-label="開啟章節目錄" aria-expanded={open} aria-controls="reading-ruler-chapters" onClick={() => { stop(); setOpen(!open); }}><span aria-hidden="true">≡</span></button>
    <div ref={track} className="reading-ruler-track" role="slider" tabIndex={0} aria-label="文章閱讀進度" aria-describedby="reading-ruler-help" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={`${percent}%，${chapter?.title ?? ""}`} aria-orientation="vertical" onPointerDown={down} onPointerMove={drag} onPointerUp={event => up(event)} onPointerCancel={event => up(event, true)} onLostPointerCapture={() => { if (gesture.current)
        stop(); }} onContextMenu={event => event.preventDefault()} onKeyDown={event => {
            const deltas: Record<string, number> = { ArrowDown: 80, ArrowUp: -80, PageDown: innerHeight * 0.75, PageUp: -innerHeight * 0.75 };
            if (event.key in deltas) {
                event.preventDefault();
                stop();
                move(deltas[event.key]);
            }
            else if (event.key === "Home" || event.key === "End") {
                event.preventDefault();
                stop();
                window.scrollTo({ top: event.key === "Home" ? bounds.current.start : bounds.current.end, behavior: "instant" });
            }
            else if (["Enter", " "].includes(event.key)) {
                event.preventDefault();
                stop();
                if (!matchMedia("(max-width: 767px)").matches)
                    setOpen(!open);
            }
            else if (event.key === "Escape") {
                stop();
                setOpen(false);
            }
        }}>
      <div className="reading-ruler-window" aria-hidden="true"><div className="reading-ruler-scale" style={{ transform: `translateY(${76 - position.progress * 600}px)` }}>{Array.from({ length: 101 }, (_, index) => <i key={index} data-major={index % 10 === 0 || undefined}/>)}</div><span className="reading-ruler-needle"/></div>
    </div>
    <span className="reading-ruler-percent" aria-hidden="true">{percent}</span>
    {open && <nav id="reading-ruler-chapters" className="reading-ruler-chapters" aria-label="文章章節"><header><strong>章節目錄</strong><button type="button" aria-label="關閉章節目錄" onClick={() => { setOpen(false); menuButton.current?.focus({ preventScroll: true }); }}>×</button></header><ol>{headings.map((heading, index) => <li key={heading.id} data-depth={heading.depth}><a ref={index === 0 ? firstLink : undefined} href={`#${heading.id}`} aria-current={position.current === heading.id ? "location" : undefined} onClick={() => { setOpen(false); requestAnimationFrame(() => { const target = document.getElementById(heading.id); if (target) {
        target.tabIndex = -1;
        target.focus({ preventScroll: true });
    } }); }}>{heading.title}</a></li>)}</ol></nav>}
  </div>;
}
