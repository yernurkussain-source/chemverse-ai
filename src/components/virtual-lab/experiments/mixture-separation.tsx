"use client";

import { useLocale, useTranslations } from "next-intl";
import { MIXTURE_META, type MixtureEquipment } from "@/features/virtual-lab/experiments/mixture-separation/meta";
import {
  isSeparated,
  MIXTURE_ACTIONS,
  observationRows,
  runActions,
  type MixtureAction,
  type MixtureState,
} from "@/features/virtual-lab/experiments/mixture-separation/model";
import type { Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.mixture-separation";

const actionsOf = (value: LabValue): MixtureAction[] =>
  Array.isArray(value.actions) ? value.actions.filter((a): a is MixtureAction => (MIXTURE_ACTIONS as readonly string[]).includes(a)) : [];

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  const revealKeys = ["saltFractionPct", "saltYieldPct", "sandYieldG", "saltYieldG", "mistakes"] as const;
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["goggles", "hotDish", "stir", "heater"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: MIXTURE_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: MIXTURE_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel: (id) => t(`equipment.${id as MixtureEquipment}`),
    questions: [
      { id: "fraction", kind: "number", label: t("questions.fraction.label"), unit: "%" },
      { id: "yield", kind: "number", label: t("questions.yield.label"), unit: "%" },
      {
        id: "whySand",
        kind: "choice",
        label: t("questions.whySand.label"),
        options: (["insoluble", "heavy", "magnetic", "crystal"] as const).map((value) => ({ value, label: t(`questions.whySand.options.${value}`) })),
      },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => ((revealKeys as readonly string[]).includes(key) ? t(`reveal.${key as (typeof revealKeys)[number]}`) : null),
  };
}

/** Зертхана сызбасы: стакан → сүзгісі бар воронка → плиткадағы табақша */
function Scene({ state }: { state: MixtureState }) {
  const t = useTranslations(`${LAB}.scene`);
  const sandColor = state.dried ? "#d9b26b" : "#a87a3d";
  // Құм мен тұз түйіршіктері (тұрақты орындар — сурет «секірмеуі» үшін)
  const grains = Array.from({ length: 26 }, (_, i) => ({ x: (i * 37) % 64, y: (i * 23) % 14, salt: i % 3 === 0 }));

  return (
    <svg viewBox="0 0 360 210" role="img" aria-label={`${t("beaker")} → ${t("filter")} → ${t("dish")}`} className="h-auto w-full">
      {/* 1. Стакан */}
      <g transform="translate(14 40)">
        {!state.dissolved && (
          <text x="45" y="-8" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="10">
            {t("mixture")}
          </text>
        )}
        {state.dissolved && !state.filtered && <rect x="4" y="30" width="82" height="86" rx="4" fill="#7cc9ec" opacity="0.45" />}
        {!state.filtered &&
          grains
            .filter((g) => state.dissolved ? !g.salt : true)
            .map((g, i) => (
              <circle key={i} cx={13 + g.x} cy={104 + g.y * 0.6} r="3" fill={g.salt ? "#f4f4f4" : sandColor} stroke={g.salt ? "#9aa" : "none"} strokeWidth="0.5" />
            ))}
        <path d="M0 6 L4 120 Q4 126 10 126 L80 126 Q86 126 86 120 L90 6" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground" />
        <text x="45" y="144" textAnchor="middle" className="fill-muted-foreground" fontSize="11">
          {t("beaker")}
        </text>
      </g>

      {/* 2. Воронка және сүзінді */}
      <g transform="translate(130 20)">
        <path d="M0 10 L100 10 L60 70 L60 96 L40 96 L40 70 Z" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground" />
        <path d="M8 14 L92 14 L52 66 L48 66 Z" fill="#f7f1e3" opacity="0.9" />
        {state.filtered && <path d="M30 40 L70 40 L54 62 L46 62 Z" fill={sandColor} />}
        <path d="M16 110 L18 176 Q18 180 22 180 L78 180 Q82 180 82 176 L84 110" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
        {state.filtered && !state.evaporated && <rect x="20" y="140" width="60" height="38" rx="3" fill="#9fdcf2" opacity="0.55" />}
        <text x="50" y="198" textAnchor="middle" className="fill-muted-foreground" fontSize="11">
          {t("filter")}
        </text>
      </g>

      {/* 3. Табақша және плитка */}
      <g transform="translate(258 92)">
        <path d="M4 28 Q44 66 84 28" fill="#fbfbfb" stroke="currentColor" strokeWidth="2.5" className="text-muted-foreground" />
        {/* Тұз кристалдары табақшаның ішінде (табақшадан кейін салынады — әйтпесе жабылып қалады) */}
        {state.evaporated &&
          [24, 36, 48, 60, 30, 42, 54].map((x, i) => (
            <rect
              key={i}
              x={x}
              y={i < 4 ? 36 : 30}
              width="6"
              height="6"
              transform={`rotate(45 ${x + 3} ${(i < 4 ? 36 : 30) + 3})`}
              fill="#ffffff"
              stroke="#7a8a99"
              strokeWidth="0.8"
            />
          ))}
        <rect x="0" y="62" width="88" height="22" rx="5" className={cn(state.evaporated ? "fill-pink/40" : "fill-panel-2")} stroke="currentColor" strokeWidth="2" />
        <text x="44" y="106" textAnchor="middle" className="fill-muted-foreground" fontSize="11">
          {t("dish")}
        </text>
      </g>
    </svg>
  );
}

/** 4-қадам: әрекеттерді ретімен таңдау; модель әр әрекетке жауап береді */
function Experiment({ value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const actions = actionsOf(value);
  const { state, log } = runActions(actions);
  const done = isSeparated(state);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_320px]">
      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-panel-2/50 p-4">
        <Scene state={state} />
        <ModelBadge className="self-start" />
      </section>
      <section className="flex min-w-0 flex-col gap-3">
        <h3 className="font-display font-semibold">{t("actionsTitle")}</h3>
        <div className="grid grid-cols-2 gap-2">
          {MIXTURE_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              disabled={done}
              onClick={() => onChange({ ...value, actions: [...actions, action] })}
              className="flex flex-col items-start gap-0.5 rounded-2xl border border-line bg-panel px-3 py-2.5 text-left transition-colors hover:border-cyan-dim disabled:opacity-50"
            >
              <span className="font-semibold">{t(`actions.${action}.label`)}</span>
              <span className="text-[0.75rem] leading-snug text-muted-foreground">{t(`actions.${action}.text`)}</span>
            </button>
          ))}
        </div>
        {done && <p className="rounded-2xl border border-good/50 bg-good/10 px-3.5 py-2.5 font-semibold text-good">✓ {t("done")}</p>}
        <div>
          <h3 className="mb-1.5 font-display text-[0.95rem] font-semibold">{t("logTitle")}</h3>
          {log.length === 0 ? (
            <p className="text-[0.85rem] text-muted-foreground">{t("logEmpty")}</p>
          ) : (
            <ol className="flex flex-col gap-1.5" aria-live="polite">
              {log.map((entry, i) => (
                <li
                  key={i}
                  className={cn(
                    "rounded-xl px-3 py-2 text-[0.85rem]",
                    entry.mistake ? "border border-amber/50 bg-amber/10" : "bg-panel-2",
                  )}
                >
                  <b className="mr-1">{entry.mistake ? "⚠" : "✓"} {t(`actions.${actions[i]}.label`)}:</b>
                  {t(`log.${entry.key as "dissolved"}`)}
                </li>
              ))}
            </ol>
          )}
        </div>
      </section>
    </div>
  );
}

/** 5-қадам: зат · қайда қалды · ериді ме (оқушы) · массасы (модель) */
function Observation({ values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const locale = useLocale() as Locale;
  return (
    <ObservationTable
      columns={[
        { key: "substance", label: t("observation.substance"), kind: "auto" },
        { key: "mass", label: t("observation.mass"), kind: "auto", model: true },
        {
          key: "place",
          label: t("observation.place"),
          kind: "select",
          options: MIXTURE_META.places.map((p) => ({ value: p, label: t(`places.${p}`) })),
        },
        {
          key: "soluble",
          label: t("observation.soluble"),
          kind: "select",
          options: MIXTURE_META.soluble.map((s) => ({ value: s, label: t(`observation.solubleOptions.${s}`) })),
        },
      ]}
      rows={observationRows().map((row, i) => ({
        id: `r${i}`,
        cells: { substance: t(`observation.substances.${row.substance}`), mass: formatDecimal(row.massG, locale, 1) },
      }))}
      values={values}
      onChange={onChange}
      hint={t("observationHint")}
    />
  );
}

function AnalysisData() {
  const t = useTranslations(`${LAB}.data`);
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-panel-2 px-3.5 py-2.5 text-[0.88rem]">
      <span>{t("mixture")}</span>
      <span className="flex flex-wrap items-center gap-2">
        {t("got")} <ModelBadge />
      </span>
      <span className="font-mono text-[0.82rem] text-muted-foreground">{t("formula")}</span>
    </div>
  );
}

export const mixtureModule: LabModule = {
  useTexts,
  initialExperiment: { actions: [] },
  isExperimentDone: (value) => isSeparated(runActions(actionsOf(value)).state),
  Experiment,
  Observation,
  isObservationDone: (_params, _experiment, values) =>
    observationRows().every((_, i) => values[`r${i}.place`] && values[`r${i}.soluble`]),
  AnalysisData,
  formatReveal: (key, value, locale) => {
    const l = locale as Locale;
    switch (key) {
      case "saltFractionPct":
      case "saltYieldPct":
        return `${formatDecimal(value, l, Number.isInteger(value) ? 0 : 2)} %`;
      case "sandYieldG":
      case "saltYieldG":
        return `${formatDecimal(value, l, 1)} г`;
      case "mistakes":
        return String(value);
      default:
        return null;
    }
  },
};
