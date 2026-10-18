import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // Тек `npm run dev` үшін: сайтты бір Wi-Fi-дағы телефоннан ашқанда жаңартулар бұғатталмасын
  // (жергілікті желі адрестері: 192.168.x.x, 10.x.x.x, 172.x.x.x, 169.254.x.x)
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*", "169.254.*.*"],
  // PWA: service worker әрқашан жаңа нұсқасы жүктелуі керек (ескі кэшке «жабысып» қалмауы үшін)
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

// next-intl: src/i18n/request.ts файлын автоматты табады
const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
