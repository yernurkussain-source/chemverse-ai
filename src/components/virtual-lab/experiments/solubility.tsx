"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { SOLUBILITY_META, type SolubilityEquipment } from "@/features/virtual-lab/experiments/solubility/meta";
import { brackets, isSample, REQUIRED, SALTS, saturated, solubilityDone, TEMPS, type Salt, type Sample } from "@/features/virtual-lab/experiments/solubility/model";
import type { Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.solubility";
const FORMULA: Record<Salt, string> = { KNO3: "KNO₃", NaCl: "NaCl" };
const COLOR: Record<Salt, string> = { KNO3: "var(--cyan)", NaCl: "var(--amber)" };

type Value = { salt: Salt; t: number; added: number; samples: Sample[] };
function valueOf(v: LabValue): Value {
  return {
    salt: (SALTS as readonly unknown[]).includes(v.salt) ? (v.salt as Salt) : "KNO3",
    t: (TEMPS as readonly unknown[]).includes(v.t) ? (v.t as number) : 20,
    added: typeof v.added === "number" ? v.added : 0,
    samples: Array.isArray(v.samples) ? v.samples.filter(isSample) : [],
  };
}

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["goggles", "hot", "stir", "noTaste"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: SOLUBILITY_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: SOLUBILITY_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel: (id) => t(`equipment.${id as SolubilityEquipment}`),
    questions: [
      {
        id: "trend",
        kind: "choice",
        label: t("questions.trend.label"),
        options: SOLUBILITY_META.questions[0].options.map((value) => ({ value, label: t(`questions.trend.options.${value}`) })),
      },
      { id: "recrystal", kind: "choice", label: t("questions.recrystal.label"), options: SOLUBILITY_META.questions[1].options.map((value) => ({ value, label: value === "both" ? t("questions.recrystal.both") : FORMULA[value] })) },
      { id: "crystals", kind: "number", label: t("questions.crystals.label"), unit: t("questions.crystals.unit") },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => {
      const [salt, temp] = key.split("_");
      return salt in FORMULA && temp ? `${FORMULA[salt as Salt]}, ${temp} °C` : null;
    },
  };
}

/** Ерігіштік графигі: оқушы тапқан шекаралар (толық ерігені — нүкте, кристалдар қалғаны — сызықтың ұшы) */
function Chart({ samples, label }: { samples: Sample[]; label: string }) {
  const x = (t: number) => 34 + t * 4.6;
  const y = (s: number) => 186 - s * 1.45;
  const points = [...brackets(samples).values()];
  return (
    <svg viewBox="0 0 330 210" role="img" aria-label={label} className="w-full max-w-md">
      {[0, 20, 40, 60, 80, 100, 120].map((s) => (
        <g key={s}>
          <line x1={x(0)} x2={x(60)} y1={y(s)} y2={y(s)} className="stroke-line" strokeWidth="0.6" />
          <text x={x(0) - 5} y={y(s) + 3} textAnchor="end" className="fill-muted-foreground font-mono text-[8px]">
            {s}
          </text>
        </g>
      ))}
      {TEMPS.map((t) => (
        <text key={t} x={x(t)} y={y(0) + 12} textAnchor="middle" className="fill-muted-foreground font-mono text-[8px]">
          {t}
        </text>
      ))}
      <text x={x(60)} y={y(0) + 22} textAnchor="end" className="fill-muted-foreground text-[8px]">
        t, °C
      </text>
      {points.map((p) => (
        <g key={`${p.salt}${p.t}`} stroke={COLOR[p.salt]} fill={COLOR[p.salt]}>
          {p.high !== null && <line x1={x(p.t)} x2={x(p.t)} y1={y(p.low)} y2={y(p.high)} strokeWidth="2" />}
          <circle cx={x(p.t)} cy={y(p.low)} r="2.8" />
        </g>
      ))}
      {SALTS.map((s, i) => (
        <g key={s}>
          <circle cx={x(2) + i * 70} cy={12} r="3" fill={COLOR[s]} />
          <text x={x(2) + i * 70 + 7} y={15} className="fill-foreground font-mono text-[9px]">
            {FORMULA[s]}
          </text>
        </g>
      ))}
    </svg>
  );
}

/** 4-қадам: таңдалған тұзды 100 г суға біртіндеп қосу */
function Experiment({ value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const v = valueOf(value);
  const full = saturated([v.salt, v.t, v.added]);
  const set = (patch: Partial<Value>, sample = false) => {
    const next = { ...v, ...patch };
    onChange({ ...next, samples: sample ? [...v.samples, [next.salt, next.t, next.added] as Sample].slice(-400) : v.samples });
  };
  const doneCount = REQUIRED.filter(([s, tt]) => v.samples.some((x) => x[0] === s && x[1] === tt && saturated(x))).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
      <section className="grid gap-4 rounded-3xl border border-line bg-panel-2/50 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
        <svg viewBox="0 0 120 130" aria-hidden="true" className="mx-auto h-36 w-auto">
          <path d="M20 10 L20 112 Q20 120 28 120 L92 120 Q100 120 100 112 L100 10" fill="rgba(80,160,230,0.3)" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
          {full && <path d="M24 118 L34 108 L44 116 L56 106 L68 117 L80 108 L96 118 Z" fill="rgb(245,245,245)" />}
          <text x="60" y="60" textAnchor="middle" className="fill-foreground font-mono text-[11px]">
            100 г H₂O
          </text>
        </svg>
        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label={t("experiment.salt")} className="flex gap-2">
            {SALTS.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={v.salt === s}
                onClick={() => set({ salt: s, added: 0 })}
                className={cn("rounded-xl border px-3 py-1.5 font-mono", v.salt === s ? "border-cyan bg-cyan/10 font-semibold" : "border-line bg-panel")}
              >
                {FORMULA[s]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[0.85rem]">{t("experiment.temperature")}</span>
            <Button type="button" variant="panel" size="pill-sm" disabled={v.t <= 0} onClick={() => set({ t: v.t - 10, added: 0 })} aria-label={t("experiment.colder")}>
              −
            </Button>
            <b className="w-14 text-center font-mono">{v.t} °C</b>
            <Button type="button" variant="panel" size="pill-sm" disabled={v.t >= 60} onClick={() => set({ t: v.t + 10, added: 0 })} aria-label={t("experiment.warmer")}>
              +
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="glow" size="pill-sm" disabled={v.added >= 200} onClick={() => set({ added: Math.min(200, v.added + 10) }, true)}>
              +10 г
            </Button>
            <Button type="button" variant="glow" size="pill-sm" disabled={v.added >= 200} onClick={() => set({ added: Math.min(200, v.added + 1) }, true)}>
              +1 г
            </Button>
            <Button type="button" variant="panel" size="pill-sm" onClick={() => set({ added: 0 })}>
              {t("experiment.reset")}
            </Button>
          </div>
          <p aria-live="polite" className={cn("text-[0.9rem] font-semibold", full ? "text-amber" : "text-good")}>
            {t("experiment.added", { added: v.added })} — {v.added === 0 ? t("experiment.empty") : full ? t("experiment.crystals") : t("experiment.dissolved")}
          </p>
        </div>
        <ModelBadge className="sm:col-span-2" />
      </section>
      <Chart samples={v.samples} label={t("experiment.chart")} />
      <p className="font-mono text-[0.8rem] text-muted-foreground">{t("experiment.progress", { count: doneCount, total: REQUIRED.length })}</p>
    </div>
  );
}

/** 5-қадам: 6 нүктенің ерігіштігі (оқушы өз шекарасынан жазады) */
function Observation({ experiment, values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const v = valueOf(experiment);
  const b = brackets(v.samples);
  return (
    <div className="flex flex-col gap-3">
      <Chart samples={v.samples} label={t("experiment.chart")} />
      <ObservationTable
        hint={t("observationHint")}
        columns={[
          { key: "point", label: t("observation.point"), kind: "auto" },
          { key: "range", label: t("observation.range"), kind: "auto", model: true },
          { key: "value", label: t("observation.value"), kind: "text", inputMode: "decimal" },
        ]}
        rows={REQUIRED.map(([salt, temp], i) => {
          const r = b.get(`${salt}:${temp}`);
          return {
            id: `r${i}`,
            cells: {
              point: `${FORMULA[salt]}, ${temp} °C`,
              range: r?.high != null ? t("observation.between", { low: r.low, high: r.high }) : t("observation.notFound"),
            },
          };
        })}
        values={values}
        onChange={onChange}
      />
    </div>
  );
}

export const solubilityModule: LabModule = {
  useTexts,
  initialExperiment: { salt: "KNO3", t: 20, added: 0, samples: [] },
  isExperimentDone: (value) => solubilityDone(valueOf(value).samples),
  Experiment,
  Observation,
  isObservationDone: (_params, _experiment, values) => REQUIRED.every((_, i) => values[`r${i}.value`]?.trim()),
  formatReveal: (_key, value, locale) => `${formatDecimal(value, locale as Locale, 1)} г`,
};
