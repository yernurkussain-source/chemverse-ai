import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["kk", "ru", "en"],
  // Қазақша — әдепкі тіл: "/" → "/kk" (қазақша), "/ru" — орысша, "/en" — ағылшынша.
  // Префикс әрдайым қойылады: браузер мен сервер маршрутты бірдей түсінеді
  // (Next 16-ның алдын ала жүктеуі "/learn" сияқты префикссіз жолдарда қателеседі).
  defaultLocale: "kk",
  localePrefix: "always",
  // Браузер тілі бойынша автоматты ауыстырмаймыз — әдепкі әрқашан қазақша
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];
