"use client";

import { useEffect } from "react";

const COPY_RESET_DELAY_MS = 1400;

function getCodeBlockText(button: HTMLButtonElement) {
  const codeBlock = button.closest(".code-block");
  const lineContent = codeBlock?.querySelectorAll(".code-line-content") ?? [];

  if (lineContent.length > 0) {
    return [...lineContent]
      .map((line) => line.textContent ?? "")
      .join("\n");
  }

  return codeBlock?.querySelector("code")?.textContent ?? "";
}

export function MarkdownCopyButtons() {
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element
        ? event.target.closest("[data-code-copy]")
        : null;

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      const originalLabel = target.textContent ?? "Copy";
      const resetLabel = () => {
        window.setTimeout(() => {
          target.textContent = originalLabel;
        }, COPY_RESET_DELAY_MS);
      };

      if (!navigator.clipboard) {
        target.textContent = "Copy unavailable";
        resetLabel();
        return;
      }

      void navigator.clipboard.writeText(getCodeBlockText(target))
        .then(() => {
          target.textContent = "Copied";
        })
        .catch(() => {
          target.textContent = "Copy failed";
        })
        .finally(() => {
          resetLabel();
        });
    };

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  return null;
}
