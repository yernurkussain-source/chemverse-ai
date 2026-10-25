"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ACTIVITY_META, ORDER_OPTIONS, type ActivityEquipment } from "@/features/virtual-lab/experiments/metal-activity/meta";
import { CELLS, METALS, runTube, SOLUTIONS, testedCells, type TubeResult } from "@/features/virtual-lab/experiments/metal-activity/model";
import type { Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.metal-activity";

const testedOf = (value: LabValue): number[] =>
  Array.isArray(value.tested) ? value.tested.filter((c): c is number => Number.isInteger(c) && c >= 0 && c < CELLS.length) : [];

const pairLabel = (cell: number) => `${CELLS[cell].metal} + ${SOLUTIONS[CELLS[cell].solution].f}`;

/** Байқалған өзгерістің аударма кілті */
function seenKey(r: TubeResult) {
  if (r.coat) return r.coat === "Cu" ? "copper" : "silver";
  if (r.h2Ml >= 20) return "fast";
  if (r.h2Ml >= 3) return "medium";
  if (r.h2Ml > 0.1) return "slow";
  return "none";
}

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["goggles", "acid", "hydrogen", "silver"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: ACTIVITY_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: ACTIVITY_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel: (id) => t(`equipment.${id as ActivityEquipment}`),
    questions: [
      {
        id: "order",
        kind: "choice",
        label: t("questions.order.label"),
        options: ACTIVITY_META.questions[0].options.map((value) => ({ value, label: ORDER_OPTIONS[value] })),
      },
      {
        id: "copper",
        kind: "choice",
        label: t("questions.copper.label"),
        options: ACTIVITY_META.questions[1].options.map((value) => ({ value, label: t(`questions.copper.options.${value}`) })),
      },
      { id: "h2Volume", kind: "number", label: t("questions.h2Volume.label"), unit: t("questions.h2Volume.unit") },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => (["h2Mg", "h2Zn", "h2Fe", "h2Volume"].includes(key) ? t(`reveal.${key as "h2Mg"}`) : null),
  };
}

const COAT_COLOR = { Cu: "rgb(196,96,52)", Ag: "rgb(222,225,232)" } as const;
const LIQUID = ["rgba(208,230,242,0.3)", "rgba(52,126,226,0.55)", "rgba(208,230,242,0.3)"];

/** Пробирка (SVG): ерітінді, металл кесегі, бетіне қонған металл және газ көпіршіктері */
function Tube({ solution, result, done }: { solution: number; result: TubeResult; done: boolean }) {
  const bubbles = done ? (result.h2Ml >= 20 ? 6 : result.h2Ml >= 3 ? 3 : result.h2Ml > 0.1 ? 1 : 0) : 0;
  return (
    <svg viewBox="0 0 40 110" aria-hidden="true" className="h-24 w-9">
      <rect x="9" y="14" width="22" height="90" rx="11" className="fill-panel" />
      <rect x="11" y="44" width="18" height="58" rx="9" fill={LIQUID[solution]} />
      {done && <rect x="15" y="84" width="10" height="14" rx="2" fill={result.coat ? COAT_COLOR[result.coat] : "rgb(112,118,130)"} />}
      {Array.from({ length: bubbles }, (_, i) => (
        <circle
          key={i}
          cx={14 + ((i * 5) % 13)}
          cy={78 - i * 5}
          r={1.6}
          fill="none"
          stroke="#9EE6F2"
          strokeWidth="1"
          className="motion-safe:animate-pulse"
        />
      ))}
      <rect x="9" y="14" width="22" height="90" rx="11" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
    </svg>
  );
}

/** 4-қадам: металл кесегін ерітіндіге салу (4 × 3 пробирка) */
function Experiment({ value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const locale = useLocale() as Locale;
  const tested = testedOf(value);
  const results = useMemo(() => CELLS.map((_, i) => runTube(i)), []);
  const [last, setLast] = useState<number | null>(null);

  function drop(cell: number) {
    onChange({ ...value, tested: [...tested, cell].slice(-60) });
    setLast(cell);
  }

  const describe = (cell: number) => {
    const r = results[cell];
    const gas = CELLS[cell].solution === 0 && r.h2Ml > 0 ? ` · ${t("experiment.gas", { volume: formatDecimal(r.h2Ml, locale, 1) })}` : "";
    return `${t(`seen.${seenKey(r)}`)}${gas}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
      <section className="overflow-x-auto rounded-3xl border border-line bg-panel-2/50 p-3 sm:p-4">
        <table className="mx-auto border-separate border-spacing-1 text-center">
          <thead>
            <tr>
              <th className="font-mono text-[0.75rem] font-normal text-muted-foreground">{t("experiment.corner")}</th>
              {SOLUTIONS.map((s) => (
                <th key={s.id} scope="col" className="font-mono text-[0.85rem]">
                  {s.f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {METALS.map((metal, m) => (
              <tr key={metal}>
                <th scope="row" className="pr-1 text-right font-mono text-[0.95rem]">
                  {metal}
                </th>
                {SOLUTIONS.map((s, solution) => {
                  const cell = m * SOLUTIONS.length + solution;
                  const done = tested.includes(cell);
                  return (
                    <td key={s.id}>
                      <button
                        type="button"
                        onClick={() => drop(cell)}
                        aria-label={`${pairLabel(cell)}${done ? ` — ${describe(cell)}` : ""}`}
                        className={cn("rounded-2xl px-1.5 pt-1 transition-colors", last === cell ? "bg-cyan/10 ring-1 ring-cyan" : "hover:bg-panel")}
                      >
                        <Tube solution={solution} result={results[cell]} done={done} />
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <ModelBadge className="mt-2" />
      </section>

      <div aria-live="polite" className="min-h-6 font-display text-[0.95rem] font-semibold">
        {last !== null && (
          <>
            <span className="font-mono">{pairLabel(last)}</span> → {describe(last)}
          </>
        )}
      </div>

      <div>
        <h3 className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 font-display text-[0.95rem] font-semibold">
          {t("experiment.log")}
          <span className="font-mono text-[0.8rem] font-normal text-muted-foreground">
            {t("experiment.progress", { count: testedCells(tested), total: CELLS.length })}
          </span>
        </h3>
        {tested.length === 0 ? (
          <p className="text-[0.85rem] text-muted-foreground">{t("experiment.empty")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(tested)].map((cell) => (
              <Button key={cell} type="button" variant="panel" size="pill-sm" onClick={() => setLast(cell)}>
                {pairLabel(cell)}
              </Button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** 5-қадам: әр металдың үш пробиркасы (модель) → әрекеттескен ерітінді саны және белсенділік орны (оқушы) */
function Observation({ experiment, values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const locale = useLocale() as Locale;
  const tested = new Set(testedOf(experiment));
  const results = useMemo(() => CELLS.map((_, i) => runTube(i)), []);
  const cellText = (cell: number) => {
    if (!tested.has(cell)) return t("observation.notTested");
    const r = results[cell];
    const gas = CELLS[cell].solution === 0 && r.h2Ml > 0 ? ` (${t("experiment.gas", { volume: formatDecimal(r.h2Ml, locale, 1) })})` : "";
    return `${t(`seen.${seenKey(r)}`)}${gas}`;
  };
  return (
    <ObservationTable
      hint={t("observationHint")}
      columns={[
        { key: "metal", label: t("observation.metal"), kind: "auto" },
        ...SOLUTIONS.map((s) => ({ key: s.id, label: s.f, kind: "auto" as const, model: true })),
        {
          key: "reactions",
          label: t("observation.reactions"),
          kind: "select",
          options: ACTIVITY_META.reactionCounts.map((v) => ({ value: v, label: v })),
        },
        { key: "rank", label: t("observation.rank"), kind: "select", options: ACTIVITY_META.ranks.map((v) => ({ value: v, label: v })) },
      ]}
      rows={METALS.map((metal, m) => ({
        id: `r${m}`,
        cells: { metal, ...Object.fromEntries(SOLUTIONS.map((s, solution) => [s.id, cellText(m * SOLUTIONS.length + solution)])) },
      }))}
      values={values}
      onChange={onChange}
    />
  );
}

export const activityModule: LabModule = {
  useTexts,
  initialExperiment: { tested: [] },
  isExperimentDone: (value) => testedCells(testedOf(value)) === CELLS.length,
  Experiment,
  Observation,
  isObservationDone: (_params, _experiment, values) => METALS.every((_, m) => values[`r${m}.reactions`] && values[`r${m}.rank`]),
  formatReveal: (key, value, locale) => (key.startsWith("h2") ? formatDecimal(value, locale as Locale, 1) : null),
};
