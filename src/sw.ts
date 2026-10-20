/**
 * CHEMVERSE AI service worker (PWA, Serwist).
 * scripts/build-sw.mjs осы файлды public/sw.js етіп жинайды (npm run build алдында).
 * - Офлайн бет, иконкалар, молекула файлдары алдын ала кэштеледі.
 * - Ашылған беттер мен JS/CSS кэште қалады — интернет үзілсе де ашылады.
 * - Live сабақ, AI және Supabase сұраулары ЕШҚАШАН кэштелмейді (әрқашан жаңа дерек).
 */
import { defaultCache } from "@serwist/turbopack/worker";
import { NetworkOnly, Serwist, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope & { __SW_MANIFEST: (PrecacheEntry | string)[] | undefined };
/** offline.html хэші (scripts/build-sw.mjs қояды) — бет өзгерсе, кэш жаңарады */
declare const __OFFLINE_REVISION__: string;

/**
 * Жеке деректері бар беттер (профиль, мұғалім кабинеті, тест, AI) кэштелмейді: мектептегі ортақ
 * құрылғыда бір оқушы шыққаннан кейін келесі адам оның деректерін офлайн көріп қоймауы үшін.
 * Тізім src/proxy.ts ішіндегі PROTECTED тізімімен бірдей (+ QR сілтемелері — санауыш үшін).
 */
const PRIVATE_PAGE = /^\/(kk|ru|en)\/(profile|teacher|onboarding|ai-tutor|exam\/session|exam\/result|q)(\/|$)/;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    { matcher: ({ url }) => url.pathname.startsWith("/api/live/") || url.pathname.startsWith("/api/ai/"), handler: new NetworkOnly() },
    { matcher: ({ url }) => url.hostname.endsWith(".supabase.co"), handler: new NetworkOnly() },
    { matcher: ({ url, sameOrigin }) => sameOrigin && PRIVATE_PAGE.test(url.pathname), handler: new NetworkOnly() },
    ...defaultCache,
  ],
  // Интернет жоқ және бет кэште болмаса — офлайн бет
  fallbacks: {
    entries: [
      { url: "/offline.html", revision: __OFFLINE_REVISION__, matcher: ({ request }) => request.destination === "document" },
    ],
  },
});

serwist.addEventListeners();

// Бұрынғы нұсқа кэштеп қойған жеке беттерді өшіреміз
async function purgePrivatePages() {
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    for (const request of await cache.keys()) {
      if (PRIVATE_PAGE.test(new URL(request.url).pathname)) await cache.delete(request);
    }
  }
}

self.addEventListener("activate", (event) => {
  (event as Event & { waitUntil: (promise: Promise<unknown>) => void }).waitUntil(purgePrivatePages());
});
