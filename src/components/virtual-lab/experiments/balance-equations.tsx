"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { BALANCE_META, type BalanceEquipment } from "@/features/virtual-lab/experiments/balance-equations/meta";
import {
  atomCounts,
  COEFF_MAX,
  COEFF_MIN,
  elementsOf,
  equationText,
  EQUATIONS,
  initialCoefficients,
  isBalanced,
  termCount,
} from "@/features/virtual-lab/experiments/balance-equations/model";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.balance-equations";

/** Әр теңдеудің коэффициенттері (жоқ не қате болса — бәрі 1) */
const coeffsOf = (value: LabValue): number[][] =>
  EQUATIONS.map((_, i) => {
    const list = Array.isArray(value.coeffs) ? value.coeffs[i] : null;
    return Array.isArray(list) && list.length === termCount(i) && list.every((c) => Number.isInteger(c) && c >= COEFF_MIN && c <= COEFF_MAX)
      ? (list as number[])
      : initialCoefficients(i);
  });

const balancedCount = (coeffs: number[][]) => coeffs.filter((c, i) => isBalanced(i, c)).length;

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["model", "indices", "check"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: BALANCE_META.predictions.map((value) => ({ value, label: value })),
    equipment: BALANCE_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentHint: t("equipmentHint"),
    equipmentLabel: (id) => t(`equipment.${id as BalanceEquipment}`),
    questions: [
      {
        id: "indices",
        kind: "choice",
        label: t("questions.indices.label"),
        options: BALANCE_META.questions[0].options.map((value) => ({ value, label: t(`questions.indices.options.${value}`) })),
      },
      {
        id: "law",
        kind: "choice",
        label: t("questions.law.label"),
        options: BALANCE_META.questions[1].options.map((value) => ({ value, label: t(`questions.law.options.${value}`) })),
      },
      { id: "waterMass", kind: "number", label: t("questions.waterMass.label"), unit: t("questions.waterMass.unit") },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => (key === "balanced" || key === "waterMass" ? t(`reveal.${key}`) : null),
  };
}

function Stepper({ value, label, onChange }: { value: number; label: string; onChange: (v: number) => void }) {
  const t = useTranslations(`${LAB}.experiment`);
  const btn = "grid size-8 place-items-center rounded-lg border border-line bg-panel text-lg font-bold hover:border-cyan-dim disabled:opacity-40";
  return (
    <span className="inline-flex flex-col items-center gap-0.5">
      <button type="button" className={btn} disabled={value >= COEFF_MAX} onClick={() => onChange(value + 1)} aria-label={t("more", { formula: label })}>
        +
      </button>
      <span aria-live="polite" className="font-mono text-xl font-bold text-cyan">
        {value}
      </span>
      <button type="button" className={btn} disabled={value <= COEFF_MIN} onClick={() => onChange(value - 1)} aria-label={t("less", { formula: label })}>
        −
      </button>
    </span>
  );
}

/** 4-қадам: коэффициенттерді таңдау және атом таразысы */
function Experiment({ value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const coeffs = coeffsOf(value);
  const [active, setActive] = useState(0);
  const eq = EQUATIONS[active];
  const current = coeffs[active];
  const { left, right } = atomCounts(active, current);
  const done = isBalanced(active, current);

  function set(k: number, v: number) {
    const next = coeffs.map((c) => [...c]);
    next[active][k] = v;
    onChange({ ...value, coeffs: next });
  }

  const term = (formula: string, k: number) => (
    <span key={formula} className="inline-flex items-center gap-1">
      <Stepper value={current[k]} label={formula} onChange={(v) => set(k, v)} />
      <span className="font-mono text-[1.1rem] font-semibold">{formula}</span>
    </span>
  );

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
      <div role="tablist" aria-label={t("experiment.equations")} className="flex flex-wrap gap-1.5">
        {EQUATIONS.map((e, i) => (
          <button
            key={e.id}
            type="button"
            role="tab"
            aria-selected={active === i}
            onClick={() => setActive(i)}
            className={cn(
              "min-w-11 rounded-full border px-3 py-1.5 font-mono text-[0.9rem]",
              active === i ? "border-cyan bg-cyan/10 font-semibold" : "border-line bg-panel-2 hover:border-cyan-dim",
            )}
          >
            {i + 1}
            {isBalanced(i, coeffs[i]) && " ✓"}
          </button>
        ))}
      </div>

      <section role="tabpanel" className="rounded-3xl border border-line bg-panel-2/50 p-4">
        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-3">
          {eq.left.map((f, k) => (
            <span key={f} className="inline-flex items-center gap-2">
              {k > 0 && <span className="font-mono text-lg">+</span>}
              {term(f, k)}
            </span>
          ))}
          <span className="px-1 font-mono text-xl">→</span>
          {eq.right.map((f, k) => (
            <span key={f} className="inline-flex items-center gap-2">
              {k > 0 && <span className="font-mono text-lg">+</span>}
              {term(f, eq.left.length + k)}
            </span>
          ))}
        </div>

        <table className="mx-auto mt-4 text-center font-mono text-[0.9rem]">
          <caption className="mb-1 font-sans text-[0.85rem] text-muted-foreground">{t("experiment.scale")}</caption>
          <thead>
            <tr className="text-muted-foreground">
              <th className="px-3 font-normal">{t("experiment.element")}</th>
              <th className="px-3 font-normal">{t("experiment.left")}</th>
              <th className="px-3 font-normal">{t("experiment.right")}</th>
            </tr>
          </thead>
          <tbody>
            {elementsOf(active).map((el) => {
              const ok = left[el] === right[el];
              return (
                <tr key={el}>
                  <th scope="row" className="px-3 font-semibold">
                    {el}
                  </th>
                  <td className={cn("px-3", ok ? "text-good" : "text-pink")}>{left[el] ?? 0}</td>
                  <td className={cn("px-3", ok ? "text-good" : "text-pink")}>
                    {right[el] ?? 0} {ok ? "=" : "≠"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p aria-live="polite" className={cn("mt-3 text-center font-display font-semibold", done ? "text-good" : "text-muted-foreground")}>
          {done ? t("experiment.balanced") : t("experiment.notBalanced")}
        </p>
        <ModelBadge className="mt-2" />
      </section>

      <p className="font-mono text-[0.8rem] text-muted-foreground">{t("experiment.progress", { count: balancedCount(coeffs), total: EQUATIONS.length })}</p>
    </div>
  );
}

/** 5-қадам: теңестірілген теңдеу (модель) → бір жақтағы атомдардың жалпы саны (оқушы санайды) */
function Observation({ experiment, values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const coeffs = coeffsOf(experiment);
  return (
    <ObservationTable
      hint={t("observationHint")}
      columns={[
        { key: "n", label: "№", kind: "auto" },
        { key: "equation", label: t("observation.equation"), kind: "auto", model: true },
        { key: "atoms", label: t("observation.atoms"), kind: "text", inputMode: "decimal", placeholder: "0" },
      ]}
      rows={EQUATIONS.map((_, i) => ({ id: `r${i}`, cells: { n: String(i + 1), equation: equationText(i, coeffs[i]) } }))}
      values={values}
      onChange={onChange}
    />
  );
}

export const balanceModule: LabModule = {
  useTexts,
  initialExperiment: { coeffs: EQUATIONS.map((_, i) => initialCoefficients(i)) },
  isExperimentDone: (value) => balancedCount(coeffsOf(value)) === EQUATIONS.length,
  Experiment,
  Observation,
  isObservationDone: (_params, _experiment, values) => EQUATIONS.every((_, i) => values[`r${i}.atoms`]?.trim()),
  formatReveal: (key, value) => (key === "balanced" ? `${value}/${EQUATIONS.length}` : key === "waterMass" ? String(value) : null),
};
