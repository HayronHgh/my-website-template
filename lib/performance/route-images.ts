export type RouteImageEntry = {
  href: string;
  src: string;
};

const routeImageMap: RouteImageEntry[] = [
  { href: "/", src: "/bg.png" },
  { href: "/projects", src: "/page-bg-projects.png" },
  { href: "/blog", src: "/page-bg-blog.png" },
  { href: "/about", src: "/page-bg-journey.png" },
  { href: "/resume", src: "/page-bg-resume.png" },
];

function normalizeHref(href: string) {
  return href.split("#")[0] || "/";
}

export const routeImagePreloads = routeImageMap.map((item) => item.src);

export function getRouteImageForHref(href: string, routes = routeImageMap) {
  const normalizedHref = normalizeHref(href);
  return routes.find((item) => item.href === normalizedHref)?.src;
}
