import { locale as rootLocale } from "next/root-params";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

// Әр сұрауда қай тілдің мәтіндерін жүктеу керегін анықтайды
export default getRequestConfig(async ({ locale: override }) => {
  const requested = override ?? (await rootLocale());
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    timeZone: "Asia/Almaty",
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
