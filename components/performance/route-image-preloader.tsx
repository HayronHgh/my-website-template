"use client";

import { useEffect } from "react";
import { preloadImage } from "@/lib/performance/preload-image";
import { routeImagePreloads } from "@/lib/performance/route-images";

type NavigatorConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

type NavigatorWithConnection = Navigator & {
  connection?: NavigatorConnection;
};

function shouldSkipImageWarmup() {
  const connection = (navigator as NavigatorWithConnection).connection;

  return Boolean(
    connection?.saveData ||
      connection?.effectiveType === "slow-2g" ||
      connection?.effectiveType === "2g",
  );
}

function scheduleIdleWarmup(callback: () => void) {
  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout: 3000 });
    return () => window.cancelIdleCallback(idleId);
  }

  const timeoutId = globalThis.setTimeout(callback, 1200);
  return () => globalThis.clearTimeout(timeoutId);
}

export function RouteImagePreloader() {
  useEffect(() => {
    if (shouldSkipImageWarmup()) {
      return undefined;
    }

    let active = true;
    const cancelIdleWarmup = scheduleIdleWarmup(() => {
      routeImagePreloads.forEach((src, index) => {
        window.setTimeout(() => {
          if (active) {
            preloadImage(src);
          }
        }, index * 180);
      });
    });

    return () => {
      active = false;
      cancelIdleWarmup();
    };
  }, []);

  return null;
}
