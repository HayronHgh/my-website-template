export type RouteImageEntry = {
  href: string;
  src: string;
};

const routeImageMap: RouteImageEntry[] = [
  { href: "/", src: "/globe.svg" },
  { href: "/projects", src: "/projects.svg" },
  { href: "/blog", src: "/file.svg" },
  { href: "/about", src: "/journey.svg" },
  { href: "/resume", src: "/resume.svg" },
];

function normalizeHref(href: string) {
  return href.split("#")[0] || "/";
}

export const routeImagePreloads = routeImageMap.map((item) => item.src);

export function getRouteImageForHref(href: string, routes = routeImageMap) {
  const normalizedHref = normalizeHref(href);
  return routes.find((item) => item.href === normalizedHref)?.src;
}
