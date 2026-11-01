"use client";

import { useEffect } from "react";

/**
 * PWA: service worker-ді тіркейді (тек production-да — әзірлеу кезінде кэш кедергі жасамауы үшін).
 * public/sw.js файлын scripts/build-sw.mjs жинайды.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // `npm run start` кезінде тіркелген SW әзірлеуде ескі JS-ті кэштен береді (hydration қатесі) — өшіреміз
      void navigator.serviceWorker.getRegistrations().then((all) => all.forEach((r) => void r.unregister()));
      return;
    }
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.error("Service worker тіркелмеді:", error);
    });
  }, []);
  return null;
}
