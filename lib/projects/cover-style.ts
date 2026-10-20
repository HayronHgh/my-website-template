import type { CSSProperties } from "react";

/** Keep uploaded images unshaded on both cards and project detail pages. */
export function getProjectCoverStyle(imageUrl: string | undefined, position: string): CSSProperties {
  return imageUrl
    ? {
        backgroundImage: `url(${JSON.stringify(imageUrl)})`,
        backgroundPosition: position,
        backgroundSize: "cover",
        boxShadow: "none",
      }
    : { backgroundPosition: position };
}
