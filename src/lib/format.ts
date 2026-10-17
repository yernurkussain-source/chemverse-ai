import type { Locale } from "@/i18n/routing";

/*
 * Ондық бөлгіш: қазақ және орыс тілдерінде — үтір, ағылшын тілінде — нүкте.
 * Intl.NumberFormat қолданылмайды: Chrome қазақ тілі үшін нүкте қояды, ал сервер (Node.js) үтір қояды —
 * мәтін сәйкес келмей, React гидратация қатесін береді. Мына функциялар екі жақта да бірдей жұмыс істейді.
 */
const DECIMAL_SEPARATOR: Record<Locale, string> = { kk: ",", ru: ",", en: "." };

/** Бекітілген ондық таңбамен: formatDecimal(18.015, "kk") → "18,02", "en" → "18.02" */
export function formatDecimal(value: number, locale: Locale, digits = 2): string {
  return value.toFixed(digits).replace(".", DECIMAL_SEPARATOR[locale]);
}

/** Санды өзгертпей, тек ондық бөлгішін ауыстырып жазу: 12.011 → "12,011" */
export function formatPlain(value: number, locale: Locale): string {
  return String(value).replace(".", DECIMAL_SEPARATOR[locale]);
}

/** Бүтін сан — бүтін күйінде, әйтпесе бір ондық таңбамен: 180 → "180", 104.5 → "104,5" */
export function formatShort(value: number, locale: Locale): string {
  return Number.isInteger(value) ? String(value) : formatDecimal(value, locale, 1);
}
