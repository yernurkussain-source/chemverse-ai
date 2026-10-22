"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { INDICATOR_META, type IndicatorEquipment } from "@/features/virtual-lab/experiments/indicator-lab/meta";
import {
  indicatorColor,
  INDICATORS,
  observedColors,
  SOLUTIONS,
  testedTubes,
  TUBES,
  tubeSolutions,
  type Indicator,
  type Trial,
} from "@/features/virtual-lab/experiments/indicator-lab/model";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabParams, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.indicator-lab";

const trialsOf = (value: LabValue): Trial[] =>
  Array.isArray(value.trials)
    ? value.trials.filter(
        (t): t is Trial =>
          typeof t === "object" && t !== null && typeof (t as Trial).tube === "number" && (INDICATORS as readonly string[]).includes((t as Trial).indicator),
      )
    : [];

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["goggles", "teacher", "noTaste", "spill"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: INDICATOR_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: INDICATOR_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel: (id) => t(`equipment.${id as IndicatorEquipment}`),
    questions: [
      {
        id: "phenol",
        kind: "choice",
        label: t("questions.phenol.label"),
        options: (["reacts", "colorless", "noIons", "weak"] as const).map((value) => ({ value, label: t(`questions.phenol.options.${value}`) })),
      },
      {
        id: "higherPh",
        kind: "choice",
        label: t("questions.higherPh.label"),
        options: (["soda", "naoh", "same"] as const).map((value) => ({ value, label: t(`questions.higherPh.options.${value}`) })),
      },
      {
        id: "whichIndicator",
        kind: "choice",
        label: t("questions.whichIndicator.label"),
        options: (["phenolphthalein", "litmus", "universal", "methylOrange"] as const).map((value) => ({
          value,
          label: t(`questions.whichIndicator.options.${value}`),
        })),
      },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => {
      const m = /^tube(\d)$/.exec(key);
      return m ? t("reveal.tube", { tube: TUBES[Number(m[1])] ?? "?" }) : null;
    },
    formatRevealValue: (key, value) => {
      if (!/^tube\d$/.test(key)) return null;
      const solution = SOLUTIONS[value];
      return solution ? `${t(`solutions.${solution.id}`)} · pH ${String(solution.pH).replace(".", ",")}` : null;
    },
  };
}

/** Пробирка (SVG): сұйықтық түсі индикатор тамызылғанда біртіндеп өзгереді */
function TestTube({ label, fill, opacity, active, dropKey }: { label: string; fill: string; opacity: number; active: boolean; dropKey: number }) {
  return (
    <svg viewBox="0 0 40 120" aria-hidden="true" className="h-28 w-10 sm:h-32">
      <circle key={dropKey} cx="20" cy="6" r="3.5" fill="#9EE6F2" className={dropKey ? "motion-safe:animate-drop" : "opacity-0"} />
      <rect x="8" y="16" width="24" height="96" rx="12" className="fill-panel" />
      <rect
        x="10"
        y="50"
        width="20"
        height="60"
        rx="10"
        fill={fill}
        fillOpacity={opacity}
        style={{ transition: "fill 900ms ease, fill-opacity 900ms ease" }}
      />
      <rect x="8" y="16" width="24" height="96" rx="12" fill="none" stroke="currentColor" strokeWidth="2" className={active ? "text-cyan" : "text-muted-foreground"} />
      <text x="20" y="40" textAnchor="middle" fontSize="12" fontWeight="700" className="fill-foreground font-mono">
        {label}
      </text>
    </svg>
  );
}

/** 4-қадам: пробирка мен индикаторды таңдап тамызу */
function Experiment({ params, value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const trials = trialsOf(value);
  const solutions = tubeSolutions(params);
  const [tube, setTube] = useState(0);
  const [indicator, setIndicator] = useState<Indicator>("litmus");
  const [dropKey, setDropKey] = useState(0);
  // Әр пробирканың соңғы сынамасы (суретте көрінетін түс)
  const lastByTube = TUBES.map((_, i) => [...trials].reverse().find((trial) => trial.tube === i));

  function drop() {
    onChange({ ...value, trials: [...trials, { tube, indicator }].slice(-60) });
    setDropKey((k) => k + 1);
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
      <section className="rounded-3xl border border-line bg-panel-2/50 p-4">
        <div className="flex justify-between gap-1 sm:justify-center sm:gap-4">
          {TUBES.map((label, i) => {
            const last = lastByTube[i];
            const color = last ? indicatorColor(last.indicator, solutions[i].pH) : null;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={tube === i}
                aria-label={`${t("experiment.tube")} ${label}`}
                onClick={() => setTube(i)}
                className={cn("rounded-2xl px-0.5 pt-1 transition-colors sm:px-2", tube === i ? "bg-cyan/10" : "hover:bg-panel")}
              >
                <TestTube
                  label={label}
                  fill={color?.rgb ?? "rgb(200,225,240)"}
                  opacity={color?.opacity ?? 0.3}
                  active={tube === i}
                  dropKey={tube === i ? dropKey : 0}
                />
              </button>
            );
          })}
        </div>
        <ModelBadge className="mt-2" />
      </section>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
        <div role="radiogroup" aria-label={t("experiment.indicator")} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {INDICATORS.map((id) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={indicator === id}
              onClick={() => setIndicator(id)}
              className={cn(
                "rounded-2xl border px-3 py-2.5 text-[0.9rem]",
                indicator === id ? "border-cyan bg-cyan/10 font-semibold" : "border-line bg-panel-2 hover:border-cyan-dim",
              )}
            >
              {t(`indicators.${id}`)}
            </button>
          ))}
        </div>
        <Button type="button" variant="glow" size="pill" onClick={drop}>
          💧 {t("experiment.drop")} → {TUBES[tube]}
        </Button>
      </div>

      <div>
        <h3 className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 font-display text-[0.95rem] font-semibold">
          {t("experiment.log")}
          <span className="font-mono text-[0.8rem] font-normal text-muted-foreground">
            {t("experiment.progress", { count: testedTubes(trials) })}
          </span>
        </h3>
        {trials.length === 0 ? (
          <p className="text-[0.85rem] text-muted-foreground">{t("experiment.empty")}</p>
        ) : (
          <ol className="flex max-h-48 flex-col-reverse gap-1 overflow-y-auto" aria-live="polite">
            {trials.map((trial, i) => {
              const color = indicatorColor(trial.indicator, solutions[trial.tube].pH);
              return (
                <li key={i} className="flex items-center gap-2 rounded-xl bg-panel-2 px-3 py-1.5 text-[0.85rem]">
                  <span aria-hidden="true" className="size-3.5 shrink-0 rounded-full border border-line" style={{ background: color.rgb, opacity: Math.max(color.opacity, 0.35) }} />
                  <b className="font-mono">{TUBES[trial.tube]}</b> · {t(`indicators.${trial.indicator}`)} → {t(`colors.${color.name}`)}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}

/** 5-қадам: әр пробиркада байқалған түстер (модель) және орта (оқушы) */
function Observation({ params, experiment, values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const seen = observedColors(params, trialsOf(experiment));
  return (
    <ObservationTable
      hint={t("observationHint")}
      columns={[
        { key: "tube", label: t("observation.tube"), kind: "auto" },
        { key: "seen", label: t("observation.seen"), kind: "auto", model: true },
        {
          key: "medium",
          label: t("observation.medium"),
          kind: "select",
          options: INDICATOR_META.media.map((m) => ({ value: m, label: t(`observation.media.${m}`) })),
        },
      ]}
      rows={TUBES.map((label, i) => ({
        id: `r${i}`,
        cells: {
          tube: label,
          seen: seen[i].length
            ? seen[i].map(([indicator, color]) => `${t(`indicators.${indicator}`)}: ${t(`colors.${color}`)}`).join("; ")
            : t("observation.notTested"),
        },
      }))}
      values={values}
      onChange={onChange}
    />
  );
}

export const indicatorModule: LabModule = {
  useTexts,
  initialExperiment: { trials: [] },
  isExperimentDone: (value) => testedTubes(trialsOf(value)) === TUBES.length,
  Experiment,
  Observation,
  isObservationDone: (_params: LabParams, _experiment, values) => TUBES.every((_, i) => values[`r${i}.medium`]),
  formatReveal: () => null,
};
