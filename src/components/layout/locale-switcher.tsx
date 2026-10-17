"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Тіл ауыстырғыш: ықшам тізім (мәзірде үш батырмаға орын жоқ).
 * Көрінетіні — қысқа код (ҚАЗ), ашылған тізімде — толық атаулар. Ауысқанда сол бет басқа тілде ашылады.
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="relative flex h-10 items-center rounded-xl border border-line bg-panel transition-colors hover:border-cyan has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-cyan">
      <span aria-hidden="true" className="flex items-center gap-1 pr-2 pl-3 font-mono text-xs font-semibold tracking-wider">
        {t(current)}
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-muted-foreground">
          <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <select
        aria-label={t("label")}
        value={current}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value as Locale;
          startTransition(() => router.replace(pathname, { locale: next }));
        }}
        className="absolute inset-0 cursor-pointer appearance-none opacity-0"
      >
        {routing.locales.map((locale) => (
          <option key={locale} value={locale} lang={locale}>
            {t(`${locale}Full`)}
          </option>
        ))}
      </select>
    </div>
  );
}
