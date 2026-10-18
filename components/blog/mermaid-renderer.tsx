"use client";
import { useEffect } from "react";
import { flowchartDeclaration, responsiveMermaid, type DiagramLayout } from "@/lib/content/mermaid-layout";

let sequence = 0;
export function MermaidRenderer() {
  useEffect(() => {
    let disposed = false; let rendering = false;
    type State = { source: string; viewport: HTMLElement; layout: DiagramLayout; narrow: boolean; rendered?: string };
    const states = new Map<HTMLElement, State>();
    const pending = new Set<HTMLElement>();
    const renderPending = async () => {
      if (rendering || disposed) return; rendering = true;
      try {
        if (!pending.size) return;
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          htmlLabels: false,
          maxEdges: 300,
          maxTextSize: 50_000,
          securityLevel: "strict",
          startOnLoad: false,
          suppressErrorRendering: true,
          theme: "dark",
        });
        while (pending.size) {
          if (disposed) break;
          const node = pending.values().next().value!;
          pending.delete(node);
          const state = states.get(node);
          if (!state || !node.isConnected) continue;
          const source = responsiveMermaid(state.source, state.layout, state.narrow);
          if (state.rendered === source) continue;
          node.dataset.mermaidState = "rendering";
          try {
            const result = await mermaid.render(`mermaid-${Date.now()}-${sequence++}`, source);
            if (disposed || !node.isConnected) continue;
            if (source !== responsiveMermaid(state.source, state.layout, state.narrow)) { pending.add(node); continue; }
            state.viewport.innerHTML = result.svg;
            const svg = state.viewport.querySelector<SVGSVGElement>("svg");
            const graph = svg?.querySelector<SVGGElement>(":scope > g");
            if (svg && graph) {
              const bounds = graph.getBBox();
              const padding = 24;
              const width = Math.ceil(bounds.width + padding * 2);
              const height = Math.ceil(bounds.height + padding * 2);
              svg.setAttribute("viewBox", `${bounds.x - padding} ${bounds.y - padding} ${width} ${height}`);
              if (width > 48 && height > 48) svg.style.width = `${width}px`;
              svg.style.maxWidth = "100%";
              svg.style.height = "auto";
            }
            state.rendered = source;
            node.dataset.mermaidState = "done";
          }
          catch {
            if (disposed || !node.isConnected) continue;
            node.dataset.mermaidState = "error"; state.rendered = source;
            const message = document.createElement("p");
            message.textContent = "流程圖無法顯示，請檢查語法或切換排列方式。";
            message.setAttribute("role", "status");
            const code = document.createElement("pre"); code.textContent = state.source;
            state.viewport.replaceChildren(message, code);
          }
        }
      } catch {
        for (const node of pending) {
          const state = states.get(node);
          if (state) state.viewport.textContent = "流程圖載入失敗，請重新整理。\n" + state.source;
        }
        pending.clear();
      } finally { rendering = false; }
    };
    const resize = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const node = entry.target as HTMLElement;
        const state = states.get(node);
        const narrow = entry.contentRect.width < 600;
        if (state && state.narrow !== narrow) { state.narrow = narrow; pending.add(node); }
      }
      void renderPending();
    });
    const discover = () => {
      for (const [node] of states) if (!node.isConnected) { resize.unobserve(node); states.delete(node); pending.delete(node); }
      for (const node of document.querySelectorAll<HTMLElement>(".mermaid-diagram")) {
        if (states.has(node)) continue;
        const original = node.querySelector<HTMLElement>(".mermaid-source");
        const source = original?.textContent?.trim();
        if (!original || !source) continue;
        original.hidden = true;
        const toolbar = document.createElement("div"); toolbar.className = "diagram-toolbar";
        toolbar.addEventListener("click", (event) => event.stopPropagation());
        const viewport = document.createElement("div"); viewport.className = "diagram-viewport";
        viewport.tabIndex = 0; viewport.setAttribute("role", "region"); viewport.setAttribute("aria-label", "流程圖，可橫向捲動");
        const state: State = { source, viewport, layout: "auto", narrow: node.clientWidth < 600 };
        states.set(node, state);
        if (flowchartDeclaration(source)) {
          const label = document.createElement("label"); label.textContent = "排列 ";
          const select = document.createElement("select");
          for (const [value, text] of [["auto", "自動"], ["horizontal", "橫向"], ["vertical", "縱向"]]) select.add(new Option(text, value));
          select.addEventListener("change", () => { state.layout = select.value as DiagramLayout; pending.add(node); void renderPending(); });
          label.append(select); toolbar.append(label);
        }
        const zoom = document.createElement("button"); zoom.type = "button"; zoom.textContent = "原尺寸檢視"; zoom.setAttribute("aria-pressed", "false");
        zoom.addEventListener("click", () => {
          const natural = viewport.classList.toggle("diagram-natural");
          zoom.setAttribute("aria-pressed", String(natural)); zoom.textContent = natural ? "適合寬度" : "原尺寸檢視";
        });
        toolbar.append(zoom); node.replaceChildren(original, toolbar, viewport);
        resize.observe(node); pending.add(node);
      }
      void renderPending();
    };
    const observer = new MutationObserver(discover);
    observer.observe(document.body, { childList: true, subtree: true }); discover();
    return () => { disposed = true; observer.disconnect(); resize.disconnect(); pending.clear(); states.clear(); };
  }, []);
  return null;
}
