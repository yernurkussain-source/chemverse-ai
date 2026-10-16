"use client";

import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale();
  const pathname = usePathname();

  return (
    <nav aria-label={t("label")} className="flex h-10 items-center rounded-xl border border-line bg-panel p-0.5">
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
              "grid h-full min-w-9 place-items-center rounded-[9px] px-1.5 font-mono text-xs font-semibold tracking-wider transition-colors sm:min-w-10 sm:px-2",
              active ? "bg-cyan text-on-accent" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t(locale)}
          </Link>
        );
      })}
    </nav>
  );
}
