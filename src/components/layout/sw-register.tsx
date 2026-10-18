"use client";

import { useEffect } from "react";

/**
 * PWA: service worker-ді тіркейді (тек production-да — әзірлеу кезінде кэш кедергі жасамауы үшін).
 * public/sw.js файлын scripts/build-sw.mjs жинайды.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("Service worker тіркелмеді:", error);
    });
  }, []);
  return null;
}
