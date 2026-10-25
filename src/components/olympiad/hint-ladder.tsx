"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

/** 3 деңгейлі ишара: біреуден ашылады */
export function HintLadder({ hints, opened, onOpen }: { hints: string[]; opened: number; onOpen: () => void }) {
  const t = useTranslations("Olympiad.problem");
  if (!hints.length) return null;
  return (
    <div className="flex flex-col gap-2">
      {opened > 0 && (
        <ol className="flex flex-col gap-2" aria-label={t("hints")}>
          {hints.slice(0, opened).map((hint, i) => (
            <li key={i} className="rounded-2xl border border-amber/40 bg-amber/10 px-4 py-2.5 text-[0.92rem]">
              <span className="font-semibold text-amber">{t("hint", { n: i + 1 })}:</span> {hint}
            </li>
          ))}
        </ol>
      )}
      {opened < hints.length && (
        <Button type="button" variant="panel" size="pill-sm" className="self-start" onClick={onOpen}>
          💡 {t("openHint", { n: opened + 1 })}
        </Button>
      )}
    </div>
  );
}

/** Шешімді қадамдап ашу */
export function StepReveal({ steps }: { steps: string[] }) {
  const t = useTranslations("Olympiad.problem");
  const [shown, setShown] = useState(1);
  return (
    <div className="flex flex-col gap-2">
      <ol className="flex flex-col gap-2" aria-live="polite">
        {steps.slice(0, shown).map((step, i) => (
          <li key={i} className="flex gap-3 rounded-2xl border border-line bg-panel-2 px-4 py-2.5">
            <span className="font-mono font-semibold text-cyan" aria-label={t("stepOf", { n: i + 1, total: steps.length })}>
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      {shown < steps.length && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="panel" size="pill-sm" onClick={() => setShown((n) => n + 1)}>
            {t("nextStep")} ↓
          </Button>
          <Button type="button" variant="ghost" size="pill-sm" onClick={() => setShown(steps.length)}>
            {t("allSteps")}
          </Button>
        </div>
      )}
    </div>
  );
}
