import type { ImgHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const pixelIconNames = [
  "about",
  "clock",
  "contact",
  "file",
  "github",
  "growth",
  "heart",
  "home",
  "journey",
  "linkedin",
  "location",
  "mail",
  "projects",
  "resume",
  "rss",
  "skills",
  "star",
  "tech-js",
  "tech-node",
  "tech-python",
  "tech-react",
  "tech-sql",
  "tech-ts",
] as const;

export type PixelIconName = (typeof pixelIconNames)[number];

type PixelIconProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "alt" | "src"> & {
  decorative?: boolean;
  label?: string;
  name: PixelIconName;
};

export function PixelIcon({
  className,
  decorative = true,
  label,
  name,
  ...props
}: PixelIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      alt={decorative ? "" : (label ?? name)}
      aria-hidden={decorative ? true : undefined}
      className={cn("pixel-icon h-4 w-4 shrink-0", className)}
      src={`/${name}.svg`}
      {...props}
    />
  );
}
