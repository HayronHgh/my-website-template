import type { HTMLAttributes, ReactNode } from "react";
import { createElement } from "react";
import { ui } from "@/components/ui/pixel-theme";
import { cn } from "@/lib/utils";
import type { Accent } from "@/data/site";

type PixelCardElement = "article" | "div" | "section";

type PixelCardProps = HTMLAttributes<HTMLElement> & {
  accent?: Accent;
  as?: PixelCardElement;
  children: ReactNode;
  interactive?: boolean;
};

const accentClasses: Record<Accent, string> = {
  cyan: "border-[#2d5364]",
  blue: "border-[#334466]",
  purple: "border-[#4b3e61]",
  pink: "border-[#5c3d56]",
  amber: "border-[#5d4b32]",
  green: "border-[#405434]",
};

export function PixelCard({
  accent = "cyan",
  as = "div",
  children,
  className,
  interactive,
  ...props
}: PixelCardProps) {
  return createElement(
    as,
    {
      className: cn(
        "pixel-card relative overflow-hidden p-5",
        ui.panel,
        accentClasses[accent],
        interactive && ui.panelHover,
        className,
      ),
      ...props,
    },
    children,
  );
}
