import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// Жеке беттер (профиль, мұғалім кабинеті, тест сессиясы, QR токендері) іздеуге шықпайды
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/*/teacher", "/*/profile", "/*/exam/session/", "/*/exam/result/", "/*/q/", "/*/auth/", "/*/onboarding", "/*/reset-password", "/*/join/"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
