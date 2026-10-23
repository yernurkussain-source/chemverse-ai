"use client";

import { useLocale, useTranslations } from "next-intl";
import type { LabOutcome } from "@/features/virtual-lab/actions";
import { CRITERIA, RUBRIC, type Criterion } from "@/features/virtual-lab/scoring";
import type { Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LabModule } from "./module";
import { ModelBadge } from "./parts";

const scoreColor = (pct: number) => (pct >= 0.85 ? "text-good" : pct >= 0.6 ? "text-cyan" : "text-amber");
const barColor = (pct: number) => (pct >= 0.85 ? "bg-good" : pct >= 0.6 ? "bg-cyan" : "bg-amber");

export type ScoreOverride = { conclusion: number; comment: string | null };

/**
 * 8-қадам және нәтиже беті: 100 ұпай, 4 критерий, кері байланыс, модельдің ашылған мәндері.
 * override — мұғалім түзеткен қорытынды ұпайы (бар болса, жалпы ұпай соның есебімен).
 */
export function ScoreView({ lab, outcome, override }: { lab: LabModule; outcome: LabOutcome; override?: ScoreOverride | null }) {
  const t = useTranslations("ChemLab");
  const tf = useTranslations("ChemLab.feedback");
  const locale = useLocale();
  const texts = lab.useTexts(
    Object.fromEntries(Object.entries(outcome.reveal).filter((entry): entry is [string, number] => typeof entry[1] === "number")),
  );
  const { feedback, reveal } = outcome;
  const breakdown = override
    ? { ...outcome.breakdown, conclusion: override.conclusion, total: outcome.breakdown.total - outcome.breakdown.conclusion + override.conclusion }
    : outcome.breakdown;
  const prediction = reveal.predictionCorrect;

  const feedbackText = (key: string, values?: Record<string, string | number>) => {
    // Сандар тілге сай ондық бөлгішпен (0,30 / 0.30)
    const formatted = Object.fromEntries(
      Object.entries(values ?? {}).map(([k, v]) => [k, typeof v === "number" && !Number.isInteger(v) ? formatDecimal(v, locale as Locale, 2) : v]),
    );
    return tf.has(key as never) ? tf(key as never, formatted as never) : key;
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-line bg-panel-2/50 p-5">
        <div>
          <p className="text-[0.85rem] text-muted-foreground">{t("scoreView.total")}</p>
          <p className={cn("font-mono text-5xl font-bold tabular-nums", scoreColor(breakdown.total / 100))}>
            {breakdown.total}
            <span className="text-2xl text-muted-foreground">/100</span>
          </p>
        </div>
        {prediction !== undefined && (
          <p
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-[0.88rem] font-semibold",
              prediction === true ? "border-good/50 bg-good/10 text-good" : "border-line text-muted-foreground",
            )}
          >
            {t(`scoreView.prediction.${prediction === true ? "right" : prediction === false ? "wrong" : "none"}`)}
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-3">
        {CRITERIA.map((criterion: Criterion) => {
          const max = RUBRIC[criterion];
          const value = breakdown[criterion];
          const items = feedback.filter((f) => f.criterion === criterion);
          return (
            <li key={criterion} className="rounded-2xl border border-line bg-panel p-4">
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-semibold">{t(`scoreView.criteria.${criterion}`)}</span>
                <span className={cn("font-mono font-semibold tabular-nums", scoreColor(value / max))}>
                  {value}/{max}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-panel-2" aria-hidden="true">
                <div className={cn("h-full rounded-full", barColor(value / max))} style={{ width: `${(value / max) * 100}%` }} />
              </div>
              {items.length > 0 && (
                <ul className="mt-2.5 flex flex-col gap-1 text-[0.88rem] text-muted-foreground">
                  {items.map((item, i) => (
                    <li key={`${item.key}-${i}`}>
                      • {feedbackText(item.key, item.values)}
                      {item.text && <span className="text-foreground"> {item.text}</span>}
                      {item.equipment?.length ? <b className="text-foreground"> {item.equipment.map(texts.equipmentLabel).join(", ")}</b> : null}
                    </li>
                  ))}
                </ul>
              )}
              {criterion === "conclusion" && (
                <div className="mt-2 flex flex-col gap-1 text-[0.78rem]">
                  {override ? (
                    <>
                      <p className="font-semibold text-good">
                        ✓ {t("scoreView.override", { score: override.conclusion })} ({t("scoreView.originalScore", { score: outcome.breakdown.conclusion })})
                      </p>
                      {override.comment && (
                        <p className="text-foreground">
                          <b>{t("scoreView.teacherComment")}</b> {override.comment}
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-amber">
                      {outcome.conclusionSource === "ai"
                        ? t("scoreView.aiGraded")
                        : outcome.conclusionSource === "pending"
                          ? `⏳ ${t("scoreView.aiPending")}`
                          : t("scoreView.provisional")}
                    </p>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="rounded-2xl border border-line bg-panel p-4">
        <h3 className="mb-2.5 flex flex-wrap items-center gap-2 font-display font-semibold">
          {t("scoreView.revealTitle")} <ModelBadge />
        </h3>
        <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(reveal).flatMap(([key, value]) => {
            const label = texts.revealLabel(key);
            const text = typeof value === "number" ? (texts.formatRevealValue?.(key, value) ?? lab.formatReveal(key, value, locale)) : null;
            if (!label || !text) return [];
            return [
              <div key={key} className="rounded-xl bg-panel-2 px-3 py-2.5">
                <dt className="text-[0.75rem] text-muted-foreground">{label}</dt>
                <dd className="m-0 font-mono font-semibold tabular-nums">{text}</dd>
              </div>,
            ];
          })}
        </dl>
      </section>
    </div>
  );
}
