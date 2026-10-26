"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MEASURE_META, type MeasureEquipment } from "@/features/virtual-lab/experiments/measurements/meta";
import {
  ACTIONS,
  CYLINDER_MAX,
  isMeasureDone,
  paramsOf,
  QUANTITIES,
  runActions,
  type MeasureAction,
} from "@/features/virtual-lab/experiments/measurements/model";
import type { Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.measurements";

const actionsOf = (value: LabValue): MeasureAction[] =>
  Array.isArray(value.actions) ? value.actions.filter((a): a is MeasureAction => (ACTIONS as readonly unknown[]).includes(a)) : [];

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["goggles", "glass", "thread", "dry"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: MEASURE_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: MEASURE_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel: (id) => t(`equipment.${id as MeasureEquipment}`),
    questions: [
      {
        id: "meniscus",
        kind: "choice",
        label: t("questions.meniscus.label"),
        options: MEASURE_META.questions[0].options.map((value) => ({ value, label: t(`questions.meniscus.options.${value}`) })),
      },
      {
        id: "tare",
        kind: "choice",
        label: t("questions.tare.label"),
        options: MEASURE_META.questions[1].options.map((value) => ({ value, label: t(`questions.tare.options.${value}`) })),
      },
      { id: "bodyVolume", kind: "number", label: t("questions.bodyVolume.label"), unit: t("questions.bodyVolume.unit") },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => (["mass", "v1", "v2", "density"].includes(key) ? t(`reveal.${key as "mass"}`) : null),
  };
}

// Цилиндр: 0 мл — y = 330, 50 мл — y = 30 (1 мл = 6 бірлік)
const Y0 = 330;
const PER_ML = 6;
const yOf = (ml: number) => Y0 - ml * PER_ML;

/** Өлшеуіш цилиндр: шкала (1 мл бөлік), су деңгейі ойыс мениск түрінде; сан жазылмайды — оқушы өзі оқиды */
function Cylinder({ level, stone, label }: { level: number | null; stone: boolean; label: string }) {
  return (
    <svg viewBox="0 0 110 350" role="img" aria-label={label} className="h-[360px] w-auto">
      <rect x="30" y="20" width="50" height="316" rx="6" className="fill-panel" />
      {level !== null && (
        <path
          d={`M31 ${yOf(level) - 2.5} Q55 ${yOf(level) + 2.5} 79 ${yOf(level) - 2.5} L79 334 L31 334 Z`}
          fill="rgba(80,160,230,0.45)"
        />
      )}
      {stone && <path d={`M44 330 Q46 ${330 - 34} 56 ${330 - 38} Q68 ${330 - 30} 66 330 Z`} fill="rgb(120,120,128)" />}
      {stone && <line x1="56" y1={330 - 38} x2="56" y2="8" stroke="currentColor" strokeWidth="0.8" className="text-muted-foreground" />}
      {Array.from({ length: CYLINDER_MAX + 1 }, (_, ml) => {
        const big = ml % 10 === 0;
        const mid = ml % 5 === 0;
        return (
          <g key={ml}>
            <line x1="30" y1={yOf(ml)} x2={30 + (big ? 14 : mid ? 10 : 6)} y2={yOf(ml)} stroke="currentColor" strokeWidth={big ? 1.2 : 0.7} className="text-foreground" />
            {big && (
              <text x="24" y={yOf(ml) + 3.5} textAnchor="end" className="fill-foreground font-mono text-[10px]">
                {ml}
              </text>
            )}
          </g>
        );
      })}
      <text x="86" y="40" className="fill-muted-foreground font-mono text-[9px]">
        мл
      </text>
      <rect x="30" y="20" width="50" height="316" rx="6" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
    </svg>
  );
}

/** Электронды таразы: дисплей, үстінде стақан және тас */
function Scale({ value, beaker, stone, locale }: { value: number; beaker: boolean; stone: boolean; locale: Locale }) {
  return (
    <svg viewBox="0 0 160 130" aria-hidden="true" className="h-36 w-auto">
      {beaker && <path d="M50 30 L50 78 Q50 84 56 84 L104 84 Q110 84 110 78 L110 30" fill="rgba(200,225,240,0.25)" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />}
      {stone && <path d="M66 84 Q68 66 80 62 Q94 68 92 84 Z" fill="rgb(120,120,128)" />}
      <rect x="30" y="86" width="100" height="6" rx="2" className="fill-muted-foreground" />
      <rect x="14" y="94" width="132" height="32" rx="6" className="fill-panel-2" stroke="currentColor" strokeWidth="1" />
      <rect x="40" y="100" width="80" height="20" rx="3" fill="#0b1f12" />
      <text x="114" y="115" textAnchor="end" className="font-mono text-[13px]" fill="#5dff8f">
        {formatDecimal(value, locale, 2)} g
      </text>
    </svg>
  );
}

/** 4-қадам: таразыда тасты өлшеу (тарамен), цилиндрде су ығыстыру */
function Experiment({ params, value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const locale = useLocale() as Locale;
  const actions = actionsOf(value);
  const state = runActions(paramsOf(params), actions);
  const last = actions.at(-1);
  // Соңғы әрекет қате болды ма (қателер саны соңғы әрекетпен өсті)
  const lastMistake = last && runActions(paramsOf(params), actions.slice(0, -1)).mistakes.length < state.mistakes.length;

  const enabled: Record<MeasureAction, boolean> = {
    beakerOn: !state.beaker,
    tare: true,
    stoneInBeaker: state.beaker && !state.stoneOnScale,
    pourWater: state.level === null,
    stoneInCylinder: !state.stoneInCylinder,
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
      <section className="grid items-end gap-4 rounded-3xl border border-line bg-panel-2/50 p-4 sm:grid-cols-2">
        <div className="flex flex-col items-center gap-2">
          <Scale value={state.scale} beaker={state.beaker} stone={state.stoneOnScale} locale={locale} />
          <div className="flex flex-wrap justify-center gap-1.5">
            {(["beakerOn", "tare", "stoneInBeaker"] as const).map((a) => (
              <Button key={a} type="button" variant="panel" size="pill-sm" disabled={!enabled[a]} onClick={() => onChange({ ...value, actions: [...actions, a].slice(-40) })}>
                {t(`actions.${a}`)}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <Cylinder level={state.level} stone={state.stoneInCylinder} label={t("experiment.cylinder")} />
          <div className="flex flex-wrap justify-center gap-1.5">
            {(["pourWater", "stoneInCylinder"] as const).map((a) => (
              <Button key={a} type="button" variant="panel" size="pill-sm" disabled={!enabled[a]} onClick={() => onChange({ ...value, actions: [...actions, a].slice(-40) })}>
                {t(`actions.${a}`)}
              </Button>
            ))}
          </div>
        </div>
        <ModelBadge className="sm:col-span-2" />
      </section>
      <p aria-live="polite" className="min-h-6 text-[0.9rem]">
        {lastMistake ? <span className="text-pink">{t(`mistake.${last as "stoneInBeaker" | "stoneInCylinder"}`)}</span> : isMeasureDone(state) ? t("experiment.done") : t("experiment.readHint")}
      </p>
    </div>
  );
}

/** 5-қадам: көрсеткіштерді жазу (цилиндрді мұнда да көруге болады) және тығыздықты есептеу */
function Observation({ params, experiment, values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const locale = useLocale() as Locale;
  const p = paramsOf(params);
  const state = runActions(p, actionsOf(experiment));
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-center gap-4 rounded-3xl border border-line bg-panel-2/50 p-3">
        <Scale value={state.scale} beaker={state.beaker} stone={state.stoneOnScale} locale={locale} />
        <Cylinder level={p.v1} stone={false} label={t("observation.before")} />
        <Cylinder level={p.v1 + p.dv} stone label={t("observation.after")} />
      </div>
      <ObservationTable
        hint={t("observationHint")}
        columns={[
          { key: "quantity", label: t("observation.quantity"), kind: "auto" },
          { key: "value", label: t("observation.value"), kind: "text", inputMode: "decimal" },
        ]}
        rows={QUANTITIES.map((q, i) => ({ id: `r${i}`, cells: { quantity: t(`observation.rows.${q}`) } }))}
        values={values}
        onChange={onChange}
      />
    </div>
  );
}

export const measureModule: LabModule = {
  useTexts,
  initialExperiment: { actions: [] },
  isExperimentDone: (value) => isMeasureDone(runActions(paramsOf({}), actionsOf(value))),
  Experiment,
  Observation,
  isObservationDone: (_params, _experiment, values) => QUANTITIES.every((_, i) => values[`r${i}.value`]?.trim()),
  formatReveal: (_key, value, locale) => formatDecimal(value, locale as Locale, Number.isInteger(value) ? 0 : 2),
};
