"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MASS_FRACTION_META, type MassFractionEquipment } from "@/features/virtual-lab/experiments/mass-fraction/meta";
import { fraction, isPrep, lastGood, massFractionDone, prepOk, TASKS, type Prep } from "@/features/virtual-lab/experiments/mass-fraction/model";
import type { Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge, Readout } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.mass-fraction";

type Value = { task: number; solute: number; water: number; preps: Prep[] };
function valueOf(v: LabValue): Value {
  return {
    task: Number.isInteger(v.task) && (v.task as number) >= 0 && (v.task as number) < TASKS.length ? (v.task as number) : 0,
    solute: typeof v.solute === "number" ? v.solute : 0,
    water: typeof v.water === "number" ? v.water : 0,
    preps: Array.isArray(v.preps) ? v.preps.filter(isPrep) : [],
  };
}

const round = (n: number) => Math.round(n * 10) / 10;

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["goggles", "spatula", "clean", "noTaste"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: MASS_FRACTION_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: MASS_FRACTION_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel: (id) => t(`equipment.${id as MassFractionEquipment}`),
    questions: [
      { id: "dilute", kind: "number", label: t("questions.dilute.label"), unit: "%" },
      {
        id: "evaporate",
        kind: "choice",
        label: t("questions.evaporate.label"),
        options: MASS_FRACTION_META.questions[1].options.map((value) => ({ value, label: t(`questions.evaporate.options.${value}`) })),
      },
      { id: "fraction", kind: "number", label: t("questions.fraction.label"), unit: "%" },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => (key.startsWith("salt_") ? t("reveal.salt", { task: key.slice(5).toUpperCase() }) : null),
  };
}

/** 4-қадам: тұзды өлшеу, суды өлшеу, араластыру */
function Experiment({ value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const locale = useLocale() as Locale;
  const v = valueOf(value);
  const task = TASKS[v.task];
  const good = lastGood(v.preps);
  const last = [...v.preps].reverse().find((p) => p[0] === v.task);
  const set = (patch: Partial<Value>) => onChange({ ...v, ...patch });
  const step = (key: "solute" | "water", d: number, max: number) => set({ [key]: Math.max(0, Math.min(max, round(v[key] + d))) });
  const fmt = (n: number) => formatDecimal(n, locale, Number.isInteger(n) ? 0 : 1);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
      <div role="tablist" aria-label={t("experiment.tasks")} className="flex flex-wrap gap-1.5">
        {TASKS.map((x, i) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            aria-selected={v.task === i}
            onClick={() => set({ task: i, solute: 0, water: 0 })}
            className={cn("rounded-full border px-3 py-1.5 text-[0.88rem]", v.task === i ? "border-cyan bg-cyan/10 font-semibold" : "border-line bg-panel-2")}
          >
            {x.id.toUpperCase()}
            {good[i] && " ✓"}
          </button>
        ))}
      </div>
      <section role="tabpanel" className="flex flex-col gap-4 rounded-3xl border border-line bg-panel-2/50 p-4">
        <p className="font-display font-semibold">{t("experiment.task", { mass: task.mass, w: task.w, solute: t(`solutes.${task.solute}`) })}</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-2">
            <Readout label={t("experiment.scales")} value={`${fmt(v.solute)} г`} />
            <div className="flex flex-wrap gap-1.5">
              {[-1, -0.5, 0.5, 1, 5].map((d) => (
                <Button key={d} type="button" variant="panel" size="pill-sm" onClick={() => step("solute", d, 100)}>
                  {d > 0 ? `+${fmt(d)}` : `−${fmt(-d)}`} г
                </Button>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Readout label={t("experiment.cylinder")} value={`${fmt(v.water)} мл`} />
            <div className="flex flex-wrap gap-1.5">
              {[-10, -1, 1, 10].map((d) => (
                <Button key={d} type="button" variant="panel" size="pill-sm" onClick={() => step("water", d, 250)}>
                  {d > 0 ? `+${d}` : `−${-d}`} мл
                </Button>
              ))}
            </div>
          </div>
        </div>
        <Button type="button" variant="glow" size="pill" disabled={v.solute + v.water <= 0} onClick={() => set({ preps: [...v.preps, [v.task, v.solute, v.water] as Prep].slice(-200) })}>
          {t("experiment.mix")}
        </Button>
        {last && (
          <p aria-live="polite" className={cn("font-semibold", prepOk(last) ? "text-good" : "text-amber")}>
            {t("experiment.result", { mass: fmt(round(last[1] + last[2])), w: formatDecimal(fraction(last[1], last[2]), locale, 1) })}{" "}
            {prepOk(last) ? t("experiment.ok") : t("experiment.notOk")}
          </p>
        )}
        <ModelBadge />
      </section>
    </div>
  );
}

/** 5-қадам: әр ерітіндінің массасы мен массалық үлесін өз өлшемдері бойынша есептеу */
function Observation({ experiment, values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const locale = useLocale() as Locale;
  const good = lastGood(valueOf(experiment).preps);
  return (
    <ObservationTable
      hint={t("observationHint")}
      columns={[
        { key: "task", label: t("observation.task"), kind: "auto" },
        { key: "used", label: t("observation.used"), kind: "auto", model: true },
        { key: "mass", label: t("observation.mass"), kind: "text", inputMode: "decimal" },
        { key: "w", label: t("observation.w"), kind: "text", inputMode: "decimal" },
      ]}
      rows={TASKS.map((x, i) => {
        const p = good[i];
        return {
          id: `r${i}`,
          cells: {
            task: `${x.id.toUpperCase()}: ${t(`solutes.${x.solute}`)}`,
            used: p ? t("observation.usedValue", { solute: formatDecimal(p[1], locale, 1), water: formatDecimal(p[2], locale, 0) }) : "—",
          },
        };
      })}
      values={values}
      onChange={onChange}
    />
  );
}

export const massFractionModule: LabModule = {
  useTexts,
  initialExperiment: { task: 0, solute: 0, water: 0, preps: [] },
  isExperimentDone: (value) => massFractionDone(valueOf(value).preps),
  Experiment,
  Observation,
  isObservationDone: (_params, _experiment, values) => TASKS.every((_, i) => values[`r${i}.mass`]?.trim() && values[`r${i}.w`]?.trim()),
  formatReveal: (_key, value, locale) => `${formatDecimal(value, locale as Locale, Number.isInteger(value) ? 0 : 1)} г`,
};
