import type { MetadataRoute } from "next";

/**
 * PWA манифесі: сайтты телефонға қосымша ретінде орнату (/manifest.webmanifest).
 * Иконкалар: public/icons (icon.svg-ден жасалған).
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "CHEMVERSE AI — химияға арналған AI платформа",
    short_name: "CHEMVERSE",
    description: "3D және AR молекулалар, AI мұғалім, виртуалды зертхана, ҰБТ тесті және Live сабақ.",
    lang: "kk",
    start_url: "/kk",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070b1a",
    theme_color: "#070b1a",
    categories: ["education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "QR сканер", url: "/kk/scan", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "AI мұғалім", url: "/kk/ai-tutor", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Live сабаққа қосылу", url: "/kk/join", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
