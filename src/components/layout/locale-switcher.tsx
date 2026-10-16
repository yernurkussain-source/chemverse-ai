"use client";

import { useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {/* Телефонда: үш батырма сыймайды, сондықтан тізім ашылады.
          Көрінетіні — қысқа код (ҚАЗ), тізімде — толық атаулар. */}
      <div className="relative flex h-10 items-center rounded-xl border border-line bg-panel has-[select:focus-visible]:outline-2 has-[select:focus-visible]:outline-offset-2 has-[select:focus-visible]:outline-cyan sm:hidden">
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

      {/* Планшет пен компьютерде: қатар тұрған батырмалар */}
      <nav aria-label={t("label")} className="hidden h-10 items-center rounded-xl border border-line bg-panel p-0.5 sm:flex">
        {routing.locales.map((locale) => {
          const active = locale === current;
          return (
            <Link
              key={locale}
              href={pathname}
              locale={locale}
              lang={locale}
              title={t(`${locale}Full`)}
              aria-current={active ? "true" : undefined}
              className={cn(
                "grid h-full min-w-10 place-items-center rounded-[9px] px-2 font-mono text-xs font-semibold tracking-wider transition-colors",
                active ? "bg-cyan text-on-accent" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(locale)}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
