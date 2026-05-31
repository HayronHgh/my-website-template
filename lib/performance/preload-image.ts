import { getRouteImageForHref } from "@/lib/performance/route-images";
import type { RouteImageEntry } from "@/lib/performance/route-images";

const preloadedImages = new Set<string>();

export function preloadImage(src: string) {
  if (typeof window === "undefined" || preloadedImages.has(src)) {
    return;
  }

  preloadedImages.add(src);

  const image = new window.Image();
  image.decoding = "async";
  image.src = src;

  if (typeof image.decode === "function") {
    void image.decode().catch(() => undefined);
  }
}

export function preloadRouteImageForHref(href: string, routes?: RouteImageEntry[]) {
  const imageSrc = getRouteImageForHref(href, routes);

  if (imageSrc) {
    preloadImage(imageSrc);
  }
}
