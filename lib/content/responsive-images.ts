const RESPONSIVE_TITLE = /^responsive;width=(\d{1,4});height=(\d{1,4});variants=(\d{3,4}(?:,\d{3,4})*)$/;
const LOCAL_WEBP = /^\/projects\/assets\/[a-z0-9-]+\/(?:[A-Za-z0-9._~-]+\/)*[A-Za-z0-9._~-]+\.webp$/;

/** Opt-in pre-generated variants. Never fetch remote images or resize at request time. */
export function getResponsiveImageProperties(src: unknown, title: unknown) {
  if (typeof src !== "string" || typeof title !== "string" || !LOCAL_WEBP.test(src)) {
    return null;
  }
  if (src.split("/").some((segment) => segment === "." || segment === "..")) return null;

  const match = RESPONSIVE_TITLE.exec(title);
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  const variants = match[3].split(",").map(Number);
  if (
    width < 1 || height < 1 || width > 8192 || height > 8192 ||
    variants.some((value, index) => value < 320 || value >= width || (index > 0 && value <= variants[index - 1]))
  ) {
    return null;
  }

  const variantUrl = (value: number) => src.replace(/\.webp$/, `-${value}.webp`);
  const fallback = variants.find((value) => value >= 1600) ?? variants.at(-1)!;
  return {
    src: variantUrl(fallback),
    srcSet: [...variants.map((value) => `${variantUrl(value)} ${value}w`), `${src} ${width}w`].join(", "),
    sizes: "(min-width: 1280px) 900px, (min-width: 768px) calc(100vw - 96px), calc(100vw - 64px)",
    width,
    height,
  };
}
