"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

export const LAB_STEPS = ["goal", "prediction", "equipment", "experiment", "observation", "analysis", "conclusion", "score"] as const;
export type LabStep = (typeof LAB_STEPS)[number];

/**
 * 8 қадамның көрсеткіші. Телефонда — «3/8-қадам · Құралдар» және жолақ, үлкен экранда — барлық қадам атауы.
 * Өткен қадамға басып оралуға болады (бағаланғаннан кейін — жоқ).
 */
export function Stepper({ current, onSelect, locked }: { current: number; onSelect: (step: number) => void; locked: boolean }) {
  const t = useTranslations("ChemLab");
  return (
    <nav aria-label={t("stepOf", { n: current + 1 })} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3 sm:hidden">
        <p className="font-mono text-[0.8rem] text-muted-foreground">
          {t("stepOf", { n: current + 1 })} · <b className="text-foreground">{t(`steps.${LAB_STEPS[current]}`)}</b>
        </p>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-panel-2 sm:hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-cyan transition-[width] duration-300" style={{ width: `${((current + 1) / LAB_STEPS.length) * 100}%` }} />
      </div>
      <ol className="hidden grid-cols-8 gap-1.5 sm:grid">
        {LAB_STEPS.map((step, i) => {
          const done = i < current;
          const reachable = !locked && i < current;
          return (
            <li key={step}>
              <button
                type="button"
                disabled={!reachable}
                onClick={() => onSelect(i)}
                aria-current={i === current ? "step" : undefined}
                className={cn(
                  "flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-center text-[0.72rem] leading-tight transition-colors",
                  i === current ? "bg-cyan/10 font-semibold text-cyan" : done ? "text-foreground hover:bg-panel-2" : "text-muted-foreground",
                  !reachable && "cursor-default",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 place-items-center rounded-full border font-mono text-[0.75rem] font-semibold",
                    i === current ? "border-cyan bg-cyan text-on-accent" : done ? "border-cyan-dim text-cyan" : "border-line",
                  )}
                >
                  {done ? "✓" : i + 1}
                </span>
                {t(`steps.${step}`)}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
