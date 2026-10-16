import type { routing } from "@/i18n/routing";
import type messages from "../../messages/kk.json";

// Мәтін кілттерін TypeScript тексеруі үшін: қате кілт жазылса, build қате береді
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
