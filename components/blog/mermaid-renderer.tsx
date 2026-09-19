"use client";
import { useEffect } from "react";

let sequence = 0;
export function MermaidRenderer() {
  useEffect(() => {
    let disposed = false; let rendering = false;
    const renderPending = async () => {
      if (rendering || disposed) return; rendering = true;
      try {
        const nodes = Array.from(document.querySelectorAll<HTMLElement>(".mermaid-diagram:not([data-mermaid-state])"));
        if (!nodes.length) return;
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
        for (const node of nodes) {
          if (disposed) break;
          const source = node.querySelector(".mermaid-source")?.textContent?.trim();
          if (!source) continue; node.dataset.mermaidState = "rendering";
          try { const result = await mermaid.render(`mermaid-${Date.now()}-${sequence++}`, source); node.innerHTML = result.svg; node.dataset.mermaidState = "done"; }
          catch { node.dataset.mermaidState = "error"; node.innerHTML = "<p>流程圖語法有誤；點擊此區塊回到原始碼修正。</p>"; }
        }
      } finally { rendering = false; }
    };
    const observer = new MutationObserver(() => void renderPending());
    observer.observe(document.body, { childList: true, subtree: true }); void renderPending();
    return () => { disposed = true; observer.disconnect(); };
  }, []);
  return null;
}
