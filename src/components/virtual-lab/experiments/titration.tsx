"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { drawTitrationCurve } from "@/components/lab/titration-curve";
import { TitrationFlask } from "@/components/lab/titration-flask";
import { Button } from "@/components/ui/button";
import { TITRATION_META, type TitrationEquipment } from "@/features/virtual-lab/experiments/titration/meta";
import { observationRows } from "@/features/virtual-lab/experiments/titration/model";
import { useIsDark } from "@/hooks/use-is-dark";
import type { Locale } from "@/i18n/routing";
import { phenolphthaleinColor, TITRATION, titrationPH } from "@/lib/chemistry/titration";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabParams, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge, Readout } from "../parts";
import { ObservationTable } from "../step-forms";

/** Тәжірибе қадамының күйі: құйылған көлем, неше рет құйылды, оқушы «тоқтаймын» деді ме */
type TitrationValue = { endpointMl: number; additions: number; stopped: boolean };

const asValue = (value: LabValue): TitrationValue => ({
  endpointMl: typeof value.endpointMl === "number" ? value.endpointMl : 0,
  additions: typeof value.additions === "number" ? value.additions : 0,
  stopped: value.stopped === true,
});

const concentrationOf = (params: LabParams) => params.c ?? TITRATION.concentration;

const STEPS = [
  { key: "ml1", ml: 1 },
  { key: "ml01", ml: 0.1 },
  { key: "drop", ml: TITRATION.dropMl },
] as const;

function useTexts(): LabTexts {
  const t = useTranslations("ChemLab.labs.titration");
  const equipmentLabel = (id: string) => t(`equipment.${id as TitrationEquipment}`);
  const revealKeys = ["trueConcentration", "equivalenceMl", "endpointMl", "overshootMl", "answerErrorPct"] as const;
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["goggles", "gloves", "burette", "spill"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: TITRATION_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: TITRATION_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel,
    questions: [
      { id: "concentration", kind: "number", label: t("questions.concentration.label"), unit: "М" },
      { id: "equivalence", kind: "number", label: t("questions.equivalence.label"), unit: "мл" },
      {
        id: "eqMedium",
        kind: "choice",
        label: t("questions.eqMedium.label"),
        options: TITRATION_META.media.map((value) => ({ value, label: t(`questions.eqMedium.options.${value}`) })),
      },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => ((revealKeys as readonly string[]).includes(key) ? t(`reveal.${key as (typeof revealKeys)[number]}`) : null),
  };
}

/** 4-қадам: бюреткадан NaOH құю (бұрынғы виртуалды титрлеудің моделі) */
function Experiment({ params, value: raw, onChange }: ExperimentProps) {
  const t = useTranslations("VirtualLab");
  const tLab = useTranslations("Lab");
  const tc = useTranslations("ChemLab.labs.titration");
  const locale = useLocale() as Locale;
  const isDark = useIsDark();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dropKey, setDropKey] = useState(0);
  const value = asValue(raw);
  const concentration = concentrationOf(params);
  const pH = titrationPH(value.endpointMl, concentration);
  const liquid = phenolphthaleinColor(pH);
  const pink = pH >= 8.2;
  const fmt = (n: number, digits = 2) => formatDecimal(n, locale, digits);
  const axisVolume = tLab("volume");
  const axisPh = tLab("ph");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Жауап (толық қисық, эквивалент сызығы) тәжірибе кезінде жасырын
    const draw = () =>
      drawTitrationCurve(canvas, value.endpointMl, {
        labels: { axisVolume, axisPh, eqMark: "" },
        acidConcentration: concentration,
        hideAnswer: true,
      });
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [value.endpointMl, concentration, isDark, axisVolume, axisPh]);

  function add(ml: number) {
    // Құйылған ерітіндіні кері қайтаруға болмайды — тек қосамыз
    onChange({ ...value, endpointMl: Math.min(TITRATION.maxVolumeMl, +(value.endpointMl + ml).toFixed(2)), additions: value.additions + 1 });
    setDropKey((k) => k + 1);
  }

  return (
    <div className="grid gap-4 md:grid-cols-[280px_1fr]">
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-panel-2/50 p-4">
        <TitrationFlask volume={value.endpointMl} liquid={liquid} dropKey={dropKey} label={tLab("flaskLabel")} text={t("flaskText")} />
        <dl className="m-0 grid w-full grid-cols-2 gap-2">
          <Readout label={tLab("volume")} value={fmt(value.endpointMl)} />
          <Readout label={tLab("ph")} value={fmt(pH)} />
        </dl>
        <p className={cn("text-center text-[0.92rem] font-bold", pink ? "text-pink" : "text-muted-foreground")} aria-live="polite">
          {pink ? t("colorPink") : t("colorNone")}
        </p>
        <ModelBadge />
      </section>
      <section className="flex min-w-0 flex-col gap-3">
        <canvas ref={canvasRef} role="img" aria-label={tLab("curveLabel")} className="block aspect-[16/10] h-auto w-full rounded-2xl bg-panel-2/50" />
        {value.stopped ? (
          <div className="flex flex-col gap-2 rounded-2xl border border-cyan-dim bg-cyan/10 p-3.5">
            <p className="font-semibold">{tc("stopped", { ml: fmt(value.endpointMl) })}</p>
            <Button type="button" variant="panel" size="pill-sm" className="self-start" onClick={() => onChange({ ...value, stopped: false })}>
              {tc("continue")}
            </Button>
          </div>
        ) : (
          <>
            <p className="text-[0.9rem] text-muted-foreground">{t("titrateHint")}</p>
            <div className="flex flex-wrap gap-2">
              {STEPS.map(({ key, ml }) => (
                <Button key={key} type="button" variant="panel" size="pill-sm" disabled={value.endpointMl >= TITRATION.maxVolumeMl} onClick={() => add(ml)}>
                  {t(`add.${key}`)}
                </Button>
              ))}
              <Button
                type="button"
                variant="glow"
                size="pill-sm"
                className="ml-auto"
                disabled={value.endpointMl <= 0}
                onClick={() => onChange({ ...value, stopped: true })}
              >
                {t("stopHere")}
              </Button>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

/** 5-қадам: V(NaOH) → pH (модель) және оқушы толтыратын түс пен орта */
function Observation({ params, experiment, values, onChange }: ObservationProps) {
  const t = useTranslations("ChemLab.labs.titration.observation");
  const locale = useLocale() as Locale;
  const rows = observationRows(concentrationOf(params), asValue(experiment).endpointMl);
  return (
    <ObservationTable
      columns={[
        { key: "volume", label: t("volume"), kind: "auto" },
        { key: "ph", label: t("ph"), kind: "auto", model: true },
        { key: "color", label: t("color"), kind: "select", options: TITRATION_META.colors.map((c) => ({ value: c, label: t(`colors.${c}`) })) },
        { key: "medium", label: t("medium"), kind: "select", options: TITRATION_META.media.map((m) => ({ value: m, label: t(`media.${m}`) })) },
      ]}
      rows={rows.map((row, i) => ({
        id: `r${i}`,
        cells: { volume: formatDecimal(row.volume, locale, 2), ph: formatDecimal(row.pH, locale, 2) },
      }))}
      values={values}
      onChange={onChange}
    />
  );
}

/** 6-қадамдағы анықтамалық деректер */
function AnalysisData({ experiment }: { params: LabParams; experiment: LabValue }) {
  const t = useTranslations("VirtualLab");
  const locale = useLocale() as Locale;
  const fmt = (n: number, digits = 2) => formatDecimal(n, locale, digits);
  return (
    <div className="flex flex-col gap-2">
      <dl className="m-0 grid grid-cols-3 gap-2 text-[0.85rem]">
        <Readout label="V(HCl), мл" value={fmt(TITRATION.acidVolumeMl, 0)} small />
        <Readout label="c(NaOH), М" value={fmt(TITRATION.concentration, 1)} small />
        <Readout label="V(NaOH), мл" value={fmt(asValue(experiment).endpointMl)} small />
      </dl>
      <p className="rounded-xl bg-panel-2 px-3.5 py-2.5 font-mono text-[0.85rem]">{t("formula")}</p>
    </div>
  );
}

export const titrationModule: LabModule = {
  useTexts,
  initialExperiment: { endpointMl: 0, additions: 0, stopped: false },
  isExperimentDone: (value) => {
    const v = asValue(value);
    return v.stopped && v.endpointMl > 0;
  },
  Experiment,
  Observation,
  isObservationDone: (params, experiment, values) =>
    observationRows(concentrationOf(params), asValue(experiment).endpointMl).every((_, i) => values[`r${i}.color`] && values[`r${i}.medium`]),
  AnalysisData,
  formatReveal: (key, value, locale) => {
    const l = locale as Locale;
    switch (key) {
      case "trueConcentration":
        return `${formatDecimal(value, l, 3)} М`;
      case "equivalenceMl":
      case "endpointMl":
        return `${formatDecimal(value, l, 2)} мл`;
      case "overshootMl":
        return `${value > 0 ? "+" : ""}${formatDecimal(value, l, 2)} мл`;
      case "answerErrorPct":
        return `${formatDecimal(value, l, 1)} %`;
      default:
        return null;
    }
  },
};
