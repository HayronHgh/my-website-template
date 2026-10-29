import type { CSSProperties } from "react";

/** Preserve the complete uploaded cover on both cards and project detail pages. */
export function getProjectCoverStyle(imageUrl: string | undefined, position: string): CSSProperties {
  return imageUrl
    ? {
        backgroundImage: `url(${JSON.stringify(imageUrl)})`,
        backgroundPosition: position,
        backgroundSize: "contain",
        boxShadow: "none",
      }
    : { backgroundPosition: position };
}
