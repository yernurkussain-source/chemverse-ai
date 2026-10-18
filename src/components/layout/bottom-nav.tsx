"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Link, usePathname } from "@/i18n/navigation";
import { AtomIcon, BookIcon, HomeIcon, ScanIcon, UserIcon } from "./nav-icons";

const ITEMS = [
  { href: "/", key: "home", Icon: HomeIcon },
  { href: "/learn", key: "learn", Icon: BookIcon },
  { href: "/scan", key: "scan", Icon: ScanIcon },
  { href: "/molecules", key: "lab3d", Icon: AtomIcon },
  { href: "/profile", key: "profile", Icon: UserIcon },
] as const;

/** Телефон мен планшетке арналған төменгі навигация (компьютерде жасырылады) */
export function BottomNav() {
  const t = useTranslations("BottomNav");
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("label")}
      className="fixed inset-x-0 bottom-0 z-30 print:hidden border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto grid h-16 max-w-xl grid-cols-5 items-center px-2">
        {ITEMS.map(({ href, key, Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          const isScan = key === "scan";
          return (
            <li key={key} className="h-full">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[0.68rem] font-semibold transition-colors",
                  active ? "text-cyan" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isScan ? (
                  // Ортадағы үлкен «Сканер» батырмасы
                  <span className="-mt-7 grid size-[52px] place-items-center rounded-2xl bg-cyan text-on-accent shadow-[0_0_22px_var(--glow)]">
                    <Icon size={24} />
                  </span>
                ) : (
                  <Icon />
                )}
                <span>{t(key)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
