"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ReadingRuler, type ReadingHeading } from "./reading-ruler";

type Heading = ReadingHeading;

/** Progressive enhancement: the original table/code/SVG remains the source of truth. */
export function ReadingTools() {
  const pathname = usePathname();
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [viewer, setViewer] = useState<{
    source: HTMLElement;
    title: string;
    trigger: HTMLButtonElement;
  } | null>(null);
  const [scale, setScale] = useState(1);
  const [wrap, setWrap] = useState(true);
  const [fontSize, setFontSize] = useState(15);
  const [query, setQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const returnScroll = useRef(0);
  const roots = useRef<HTMLElement[]>([]);
  const viewerIsOpen = useRef(false);

  useEffect(() => {
    const mounted = new Map<HTMLElement, () => void>();
    const observedHeadings = new WeakMap<HTMLElement, HTMLElement[]>();
    const refresh = () => {
      if (location.pathname.startsWith("/admin")) {
        setHeadings((old) => (old.length ? [] : old));
        return;
      }
      for (const [root, cleanup] of mounted)
        if (!root.isConnected) {
          cleanup();
          mounted.delete(root);
        }
      roots.current = [
        ...document.querySelectorAll<HTMLElement>("main .prose-content"),
      ];
      for (const root of roots.current) {
        const headingNodes=[...root.querySelectorAll<HTMLElement>("h1[id],h2[id],h3[id]")];
        const previous=observedHeadings.get(root);
        const changedHeadings=previous&&(previous.length!==headingNodes.length||headingNodes.some((node,i)=>node!==previous[i]));
        const unenhanced=[...root.querySelectorAll<HTMLElement>("table,.code-block,.mermaid-diagram,figure.markdown-chart")].some(node=>!node.parentElement?.classList.contains("reading-embed")&&(!node.closest(".mermaid-diagram")||node.matches(".mermaid-diagram")));
        if (mounted.has(root)&&!changedHeadings&&!unenhanced) continue;
        mounted.get(root)?.();mounted.delete(root);
        observedHeadings.set(root,headingNodes);
        root.classList.add("reading-prose");
        const cleanups: (() => void)[] = [];
        for (const source of root.querySelectorAll<HTMLElement>(
          "table, .code-block, .mermaid-diagram, figure.markdown-chart",
        )) {
          const kind = source.matches("table")
            ? "表格"
            : source.matches(".code-block")
              ? "程式碼"
              : source.matches(".mermaid-diagram")
                ? "流程圖"
                : "統計圖";
          const holder = document.createElement("div");
          holder.className = "reading-embed";
          const toolbar = document.createElement("div");
          toolbar.className = "reading-embed-toolbar";
          const label = document.createElement("span");
          label.textContent =
            kind === "表格"
              ? `表格 · ${source.querySelectorAll("tbody tr").length} 列 × ${source.querySelector("tr")?.children.length ?? 0} 欄`
              : kind;
          const expand = document.createElement("button");
          expand.type = "button";
          expand.textContent = "完整檢視 ↗";
          expand.setAttribute("aria-haspopup", "dialog");
          const launch = () => {
            returnScroll.current = window.scrollY;
            viewerIsOpen.current = true;
            setScale(1);
            setWrap(true);
            setFontSize(15);
            setQuery("");
            setViewer({ source, title: kind, trigger: expand });
          };
          expand.addEventListener("click", launch);
          toolbar.append(label, expand);
          if (source.matches(".mermaid-diagram")) {
            const ready = () => {
              const loading = !source.querySelector("svg,.mermaid-error");
              expand.disabled = loading;
              expand.textContent = loading ? "流程圖準備中…" : "完整檢視 ↗";
            };
            const drawing = new MutationObserver(ready);
            drawing.observe(source, { subtree: true, childList: true });
            ready();
            cleanups.push(() => drawing.disconnect());
          }
          source.before(holder);
          holder.append(toolbar, source);
          if (source.matches("table")) {
            if (source.querySelectorAll("tbody tr").length > 5)
              source.classList.add("reading-table-preview");
            const all = document.createElement("button");
            all.type = "button";
            all.textContent = "展開全部列";
            all.className = "reading-expand";
            const toggle = () => {
              source.classList.toggle("reading-table-expanded");
              all.textContent = source.classList.contains(
                "reading-table-expanded",
              )
                ? "收合預覽"
                : "展開全部列";
            };
            if (source.classList.contains("reading-table-preview")) {
              all.addEventListener("click", toggle);
              holder.append(all);
            }
            cleanups.push(() => all.removeEventListener("click", toggle));
          }
          if (source.matches(".code-block")) {
            const code = source.querySelector("code");
            if ((code?.textContent?.split("\n").length ?? 0) > 16) {
              source.classList.add("reading-code-preview");
              const toggle = document.createElement("button");
              toggle.type = "button";
              toggle.textContent = "展開程式碼";
              toggle.className = "reading-expand";
              const click = () => {
                source.classList.toggle("reading-code-expanded");
                toggle.textContent = source.classList.contains(
                  "reading-code-expanded",
                )
                  ? "收合程式碼"
                  : "展開程式碼";
              };
              toggle.addEventListener("click", click);
              holder.append(toggle);
              cleanups.push(() => toggle.removeEventListener("click", click));
            }
            const wrapping = document.createElement("button");
            wrapping.type = "button";
            wrapping.textContent = "切換換行";
            const toggle = () => source.classList.toggle("reading-code-nowrap");
            wrapping.addEventListener("click", toggle);
            toolbar.insertBefore(wrapping, expand);
            cleanups.push(() => wrapping.removeEventListener("click", toggle));
          }
          cleanups.push(() => {
            expand.removeEventListener("click", launch);
            if (holder.isConnected) {
              holder.before(source);
              holder.remove();
            }
          });
        }
        mounted.set(root, () => cleanups.forEach((fn) => fn()));
      }
      const next = roots.current.flatMap((root) =>
        [...root.querySelectorAll<HTMLElement>("h1[id],h2[id],h3[id]")].map(
          (h) => ({
            id: h.id,
            title: h.textContent ?? "",
            depth: Number(h.tagName[1]),
          }),
        ),
      );
      setHeadings((old) =>
        JSON.stringify(old) === JSON.stringify(next) ? old : next,
      );
    };
    const observer = new MutationObserver(() => {
      if (!viewerIsOpen.current) refresh();
    });
    observer.observe(document.querySelector("main") ?? document.body, {
      childList: true,
      subtree: true,
    });
    refresh();
    return () => {
      observer.disconnect();
      mounted.forEach((fn) => fn());
    };
  }, []);

  useEffect(() => {
    if (!viewer || !canvas.current) return;
    const source = viewer.source.cloneNode(true) as HTMLElement;
    source.classList.remove("mermaid-diagram");
    source
      .querySelectorAll("button,select,.diagram-toolbar,.code-line-number")
      .forEach((n) => n.remove());
    source.classList.remove("reading-table-preview", "reading-code-preview");
    const ids = new Map<string, string>();
    source.querySelectorAll("[id]").forEach((n) => {
      const original = n.id;
      const next = `reading-view-${original}`;
      ids.set(original, next);
      n.id = next;
    });
    source.removeAttribute("id");
    source.querySelectorAll("style").forEach((style) => {
      let css = style.textContent ?? "";
      for (const [oldId, newId] of [...ids].sort(
        ([a], [b]) => b.length - a.length,
      ))
        css = css.replaceAll(`#${oldId}`, `#${newId}`);
      style.textContent = css;
    });
    source.querySelectorAll("*").forEach((n) => {
      for (const attribute of [...n.attributes]) {
        const value = attribute.value.replace(
          /url\(#([^)]+)\)/g,
          (match, id: string) => (ids.has(id) ? `url(#${ids.get(id)})` : match),
        );
        const replacement =
          value.startsWith("#") && ids.has(value.slice(1))
            ? `#${ids.get(value.slice(1))}`
            : value;
        if (replacement !== attribute.value)
          n.setAttribute(attribute.name, replacement);
      }
    });
    // Keep the site's rendered, sanitized content; never render user-supplied HTML here.
    canvas.current.replaceChildren(source);
    dialog.current?.showModal();
    const scroll = window.scrollY;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      window.scrollTo(0, scroll);
    };
  }, [viewer]);

  function close() {
    const trigger = viewer?.trigger;
    dialog.current?.close();
    viewerIsOpen.current = false;
    setViewer(null);
    requestAnimationFrame(() => {
      window.scrollTo(0, returnScroll.current);
      trigger?.focus({ preventScroll: true });
    });
  }
  function search() {
    if (!query || !canvas.current) return;
    const lines = canvas.current.querySelectorAll<HTMLElement>(".code-line");
    for (const line of lines) {
      line.classList.remove("reading-match");
      if (line.textContent?.toLowerCase().includes(query.toLowerCase()))
        line.classList.add("reading-match");
    }
    canvas.current
      .querySelector(".reading-match")
      ?.scrollIntoView({ block: "center" });
  }
  return (
    <>
      {headings.length > 1 && !viewer && <ReadingRuler key={pathname} headings={headings} />}
      <dialog
        className="reading-dialog"
        ref={dialog}
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
        aria-label={`${viewer?.title ?? "內容"}完整檢視`}
      >
        <header>
          <strong>{viewer?.title}</strong>
          <button type="button" onClick={close} autoFocus>
            關閉 ×
          </button>
        </header>
        <div className="reading-view-controls">
          {viewer?.title === "程式碼" ? (
            <>
              <button type="button" onClick={() => setWrap(!wrap)}>
                {wrap ? "不換行" : "自動換行"}
              </button>
              <button
                type="button"
                onClick={() => setFontSize(Math.max(12, fontSize - 1))}
              >
                A−
              </button>
              <button
                type="button"
                onClick={() => setFontSize(Math.min(28, fontSize + 1))}
              >
                A＋
              </button>
              <input
                aria-label="搜尋程式碼"
                placeholder="搜尋程式碼"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") search();
                }}
              />
              <button type="button" onClick={search}>
                尋找
              </button>
              <button
                type="button"
                onClick={async () => {
                  const content =
                    viewer.source.querySelectorAll(".code-line-content");
                  const text = content.length
                    ? [...content].map((n) => n.textContent).join("\n")
                    : (viewer.source.querySelector("code")?.textContent ?? "");
                  try {
                    await navigator.clipboard.writeText(text);
                    setQuery("");
                  } catch {
                    setQuery("複製失敗，請選取複製");
                  }
                }}
              >
                複製
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setScale(Math.max(0.5, scale - 0.25))}
              >
                −
              </button>
              <span>{Math.round(scale * 100)}%</span>
              <button
                type="button"
                onClick={() => setScale(Math.min(4, scale + 0.25))}
              >
                ＋
              </button>
              <button type="button" onClick={() => setScale(1)}>
                適合畫面
              </button>
              <button
                type="button"
                onClick={() => {
                  const svg = viewer?.source.querySelector("svg");
                  const natural = svg?.viewBox.baseVal.width;
                  setScale(
                    natural && canvas.current
                      ? Math.min(
                          8,
                          Math.max(
                            1,
                            natural /
                              Math.max(1, canvas.current.clientWidth - 32),
                          ),
                        )
                      : 1,
                  );
                }}
              >
                原尺寸
              </button>
            </>
          )}
        </div>
        <div
          className="reading-view-scroll"
          onPointerDown={(e) => {
            if (
              e.pointerType !== "mouse" ||
              (e.target as Element).closest("a,button,input")
            )
              return;
            const node = e.currentTarget;
            node.setPointerCapture(e.pointerId);
            const x = e.clientX,
              y = e.clientY,
              left = node.scrollLeft,
              top = node.scrollTop;
            const move = (p: PointerEvent) => {
              node.scrollLeft = left - p.clientX + x;
              node.scrollTop = top - p.clientY + y;
            };
            const done = () => {
              node.removeEventListener("pointermove", move);
              node.removeEventListener("pointerup", done);
              node.removeEventListener("pointercancel", done);
            };
            node.addEventListener("pointermove", move);
            node.addEventListener("pointerup", done);
            node.addEventListener("pointercancel", done);
          }}
        >
          <div
            className={`reading-view-canvas prose-content ${wrap ? "reading-wrap" : "reading-nowrap"}`}
            ref={canvas}
            style={{ zoom: viewer?.title === "程式碼" ? 1 : scale, fontSize }}
          />
        </div>
      </dialog>
    </>
  );
}
