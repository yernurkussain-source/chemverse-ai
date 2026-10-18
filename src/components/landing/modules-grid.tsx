import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Section, SectionHead } from "./section";

// Иконкалар prototype.html-ден
const ICONS: Record<ModuleKey, ReactNode> = {
  molecules: (
    <>
      <circle className="text-cyan" cx="11" cy="11" r="4" fill="currentColor" />
      <circle className="text-foreground" cx="4" cy="6" r="2.5" fill="currentColor" />
      <circle className="text-foreground" cx="18" cy="6" r="2.5" fill="currentColor" />
      <path className="text-muted-foreground" d="M6 7l3 2M16 7l-3 2" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  gesture: (
    <path
      className="text-cyan"
      d="M7 20v-8M7 12V4.5a1.5 1.5 0 013 0V11M10 11V3.5a1.5 1.5 0 013 0V11M13 11V5a1.5 1.5 0 013 0v8c0 4-2 7-6 7H9"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
  ),
  lab: (
    <>
      <path
        className="text-pink"
        d="M8 3h6M9 3v6l-5 9a1.5 1.5 0 001.3 2h11.4a1.5 1.5 0 001.3-2l-5-9V3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path className="text-pink" d="M6.5 15h9" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  tutor: (
    <>
      <rect className="text-cyan" x="3" y="4" width="16" height="12" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path className="text-cyan" d="M7 20l2-4M8 9h6M8 12h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  live: (
    <>
      <rect className="text-cyan" x="3" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect className="text-cyan" x="13" y="3" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect className="text-cyan" x="3" y="13" width="6" height="6" rx="1" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path className="text-cyan" d="M13 13h2v2h-2zM17 17h2v2h-2zM17 13h2M13 19h2" stroke="currentColor" strokeWidth="1.6" />
    </>
  ),
  plan: (
    <>
      <path className="text-amber" d="M5 3h9l3 3v13H5z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path className="text-amber" d="M8 9h6M8 12h6M8 15h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </>
  ),
  exams: (
    <path className="text-good" d="M4 18V9M9 18V5M14 18v-6M19 18V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  ),
};

type ModuleKey = "molecules" | "gesture" | "lab" | "tutor" | "live" | "plan" | "exams";

const MODULES: ModuleKey[] = ["molecules", "gesture", "lab", "tutor", "live", "plan", "exams"];

export function ModulesGrid() {
  const t = useTranslations("Modules");

  return (
    <Section id="modules">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} text={t("text")} />
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {MODULES.map((key, index) => {
          const wide = index === 0;
          return (
            <article
              key={key}
              className={cn(
                "flex min-w-0 flex-col gap-2.5 rounded-[18px] border border-line bg-panel p-5 shadow-[0_1px_2px_var(--shadow)] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-cyan-dim dark:shadow-none",
                wide && "bg-linear-135 from-panel-2 to-panel sm:col-span-2",
              )}
            >
              <div className="grid size-10 place-items-center rounded-xl border border-line bg-panel-2">
                <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
                  {ICONS[key]}
                </svg>
              </div>
              <h3 className="text-[1.02rem] font-semibold">{t(`items.${key}.title`)}</h3>
              <p className="text-[0.92rem] text-muted-foreground">{t(`items.${key}.text`)}</p>
              <span className="mt-auto font-mono text-[0.7rem] tracking-[0.08em] text-muted-foreground uppercase">
                {t(`items.${key}.who`)}
              </span>
            </article>
          );
        })}
      </div>
    </Section>
  );
}
