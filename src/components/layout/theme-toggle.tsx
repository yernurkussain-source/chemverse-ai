"use client";

import { useTranslations } from "next-intl";
import { useIsDark } from "@/hooks/use-is-dark";

export function ThemeToggle() {
  const t = useTranslations("Theme");
  const isDark = useIsDark();

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("cv-theme", next ? "dark" : "light");
    } catch {
      // Жеке (incognito) режимде localStorage жабық болуы мүмкін — режим бәрібір ауысады
    }
  }

  const label = isDark ? t("toLight") : t("toDark");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="grid size-10 place-items-center rounded-xl border border-line bg-panel text-foreground transition-colors hover:border-cyan"
    >
      {/* Ай — ашық режимде, күн — қараңғы режимде */}
      <svg className="dark:hidden" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <path
          d="M15 11.2A6.5 6.5 0 016.8 3a6.5 6.5 0 108.2 8.2z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
      <svg className="hidden dark:block" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M9 1.5v2M9 14.5v2M1.5 9h2M14.5 9h2M3.7 3.7l1.4 1.4M12.9 12.9l1.4 1.4M3.7 14.3l1.4-1.4M12.9 5.1l1.4-1.4"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
