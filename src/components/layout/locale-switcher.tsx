"use client";

import { useTransition } from "react";
import { Menu } from "@base-ui/react/menu";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

/**
 * Тіл ауыстырғыш: батырмада қысқа код (ҚАЗ), ашылған мәзірде толық атаулар.
 * Браузердің <select> тізімі түске боялмайды, сондықтан өз мәзіріміз (Base UI Menu:
 * пернетақта, экран оқу құралы, сыртын басқанда жабылу — бәрі дайын).
 * Ауысқанда сол бет басқа тілде ашылады.
 */
export function LocaleSwitcher() {
  const t = useTranslations("LocaleSwitcher");
  const current = useLocale() as Locale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function change(next: Locale) {
    if (next === current) return;
    startTransition(() => router.replace(pathname, { locale: next }));
  }

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={t("label")}
        disabled={isPending}
        className="group flex h-10 items-center gap-1.5 rounded-xl border border-line bg-panel pr-2.5 pl-3 font-mono text-xs font-semibold tracking-wider text-foreground transition-colors hover:border-cyan focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan disabled:opacity-60 data-[popup-open]:border-cyan"
      >
        {t(current)}
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          aria-hidden="true"
          className="text-muted-foreground transition-transform duration-200 group-data-[popup-open]:rotate-180"
        >
          <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Menu.Trigger>

      <Menu.Portal>
        <Menu.Positioner side="bottom" align="end" sideOffset={8} className="z-50">
          <Menu.Popup className="min-w-44 origin-[var(--transform-origin)] rounded-2xl border border-line bg-panel p-1.5 shadow-xl shadow-black/20 outline-none transition-[opacity,transform] duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0">
            <Menu.RadioGroup value={current} onValueChange={(value) => change(value as Locale)}>
              {routing.locales.map((locale) => (
                <Menu.RadioItem
                  key={locale}
                  value={locale}
                  lang={locale}
                  closeOnClick
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[0.92rem] text-foreground outline-none select-none data-[checked]:font-semibold data-[checked]:text-cyan data-[highlighted]:bg-panel-2"
                >
                  <span className="w-8 font-mono text-[0.7rem] font-semibold tracking-wider text-muted-foreground">
                    {t(locale)}
                  </span>
                  <span className="flex-1">{t(`${locale}Full`)}</span>
                  <Menu.RadioItemIndicator className="text-cyan">
                    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                      <path d="M3 7.5l2.5 2.5L11 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
