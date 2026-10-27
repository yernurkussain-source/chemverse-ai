"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./bottom-nav";

// Басты беттегі бөлімдер (id-лері landing компоненттерінде). modules (hero-ның астында) мен app (footer-де «Қосымшаны орнату») жоқ — 1180px-ке сыймайды
const LINKS = ["lab", "ai", "class", "teacher"] as const;
// Төменгі мәзір компьютерде жасырылады: Басты — логотипте, Профиль — «Кіру» батырмасында, қалғаны осында
const APP_ITEMS = NAV_ITEMS.filter(({ key }) => key === "learn" || key === "scan" || key === "lab3d");

/** Компьютердегі жоғарғы мәзір: негізгі бөлімдер, ал басты бетте — оның бөлімдеріне сілтемелер де (кең экранда) */
export function HeaderNav() {
  const t = useTranslations("Header");
  const tn = useTranslations("BottomNav");
  const pathname = usePathname();
  const home = pathname === "/";

  return (
    <nav aria-label={t("menuLabel")} className="ml-auto hidden items-center gap-5 text-[0.9rem] text-muted-foreground lg:flex">
      {APP_ITEMS.map(({ href, key }) => {
        const active = pathname.startsWith(href);
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn("whitespace-nowrap font-semibold transition-colors hover:text-foreground", active ? "text-cyan" : "text-foreground")}
          >
            {tn(key)}
          </Link>
        );
      })}
      {home && (
        <>
          <span aria-hidden className="hidden h-4 w-px bg-line xl:block" />
          {LINKS.map((id) => (
            <Link key={id} href={`/#${id}`} className="hidden whitespace-nowrap transition-colors hover:text-foreground xl:inline">
              {t(`links.${id}`)}
            </Link>
          ))}
        </>
      )}
    </nav>
  );
}
