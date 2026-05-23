type RouteImage = {
  href: string;
  src: string;
};

const routeImageMap: RouteImage[] = [];

function normalizeHref(href: string) {
  return href.split("#")[0] || "/";
}

export const routeImagePreloads = routeImageMap.map((item) => item.src);

export function getRouteImageForHref(href: string) {
  const normalizedHref = normalizeHref(href);
  return routeImageMap.find((item) => item.href === normalizedHref)?.src;
}
