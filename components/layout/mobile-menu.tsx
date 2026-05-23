"use client";

import { useState } from "react";
import Link from "next/link";
import { NeonButton } from "@/components/ui/neon-button";
import { PixelCard } from "@/components/ui/pixel-card";
import { PixelIcon } from "@/components/ui/pixel-icon";
import { navigationItems } from "@/data/site";
import { preloadRouteImageForHref } from "@/lib/performance/preload-image";
import { cn } from "@/lib/utils";
import type { NavigationItem } from "@/data/site";

type MobileMenuProps = {
  pathname: string;
};

function normalizeHref(href: string) {
  return href.split("#")[0] || "/";
}

function isActivePath(pathname: string, item: NavigationItem) {
  const href = normalizeHref(item.href);
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function MobileMenu({ pathname }: MobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <NeonButton
        accent="cyan"
        aria-controls="mobile-navigation"
        aria-expanded={isOpen}
        aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        className="h-11 w-11 shrink-0 px-0"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        variant="secondary"
      >
        <span
          aria-hidden
          className="relative block h-4 w-4 before:absolute before:left-0 before:top-0 before:h-0.5 before:w-4 before:bg-current before:shadow-[0_6px_0_current,0_12px_0_current]"
        />
      </NeonButton>

      {isOpen ? (
        <PixelCard
          accent="cyan"
          className="fixed! left-4 right-4 top-20 z-50 p-3!"
          id="mobile-navigation"
        >
          <nav className="flex flex-col gap-2">
            {navigationItems.map((item) => {
              return (
                <Link
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-[4px] border border-[#26344d] bg-[#101827] px-3 py-2 font-mono text-sm font-bold text-[#b7c2e0] shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 hover:border-[#6ea8b0] hover:bg-[#151e2f] hover:text-[#eef3ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200",
                    isActivePath(pathname, item) &&
                      "border-[#6ea8b0] bg-[#151e2f] text-[#b9dfe3] shadow-[inset_0_-2px_0_#050914,inset_0_1px_0_rgba(255,255,255,0.06)]",
                  )}
                  href={item.href}
                  key={item.href}
                  onFocus={() => preloadRouteImageForHref(item.href)}
                  onClick={() => setIsOpen(false)}
                  onTouchStart={() => preloadRouteImageForHref(item.href)}
                >
                  <PixelIcon className="h-4 w-4 shrink-0" name={item.icon} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </PixelCard>
      ) : null}
    </div>
  );
}
