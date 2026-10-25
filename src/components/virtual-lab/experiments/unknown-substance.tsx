"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { FLAME } from "@/features/virtual-lab-3d/game/flame-rules";
import { UNKNOWN_META, type UnknownEquipment } from "@/features/virtual-lab/experiments/unknown-substance/meta";
import {
  CANDIDATES,
  ION_CHOICES,
  ionLabel,
  SEEN,
  TESTS,
  type Seen,
  type UnknownTest,
} from "@/features/virtual-lab/experiments/unknown-substance/model";
import { runUnknownTest } from "@/features/virtual-lab/unknown-action";
import type { Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.unknown-substance";

type Trial = { test: UnknownTest; seen: Seen };

const trialsOf = (value: LabValue): Trial[] =>
  Array.isArray(value.tests)
    ? value.tests.filter(
        (t): t is Trial =>
          typeof t === "object" && t !== null && (TESTS as readonly unknown[]).includes((t as Trial).test) && (SEEN as readonly unknown[]).includes((t as Trial).seen),
      )
    : [];

/** Әр сынақтың соңғы нәтижесі */
const lastSeen = (trials: Trial[]) => new Map(trials.map((t) => [t.test, t.seen]));

/** Анықтамалық атомдық массалар (молярлық массаны есептеуге) */
const ATOMIC_MASSES = "Na 23 · K 39 · Ba 137 · Cu 64 · Fe 56 · Cl 35,5 · I 127 · S 32 · C 12 · O 16";

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["goggles", "flame", "unknown", "toxic"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: UNKNOWN_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: UNKNOWN_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel: (id) => t(`equipment.${id as UnknownEquipment}`),
    questions: [
      { id: "formula", kind: "choice", label: t("questions.formula.label"), options: CANDIDATES.map((c) => ({ value: c.id, label: c.f })) },
      { id: "molarMass", kind: "number", label: t("questions.molarMass.label"), unit: t("questions.molarMass.unit") },
      {
        id: "hno3",
        kind: "choice",
        label: t("questions.hno3.label"),
        options: UNKNOWN_META.hno3Options.map((value) => ({ value, label: t(`questions.hno3.options.${value}`) })),
      },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => (key === "unknown" || key === "molarMass" ? t(`reveal.${key}`) : null),
    formatRevealValue: (key, value) => {
      if (key !== "unknown") return null;
      const c = CANDIDATES[value];
      return c ? `${c.f} — ${t(`names.${c.id}`)}` : null;
    },
  };
}

const PPT_FILL: Partial<Record<Seen, string>> = {
  white: "rgb(240,240,236)",
  yellow: "rgb(238,222,130)",
  blue: "rgb(70,140,232)",
  brown: "rgb(158,72,30)",
};

const rgb = (c: readonly number[]) => `rgb(${c.join(",")})`;

/** Нәтиженің суреті: пробирка (тұнба, көпіршік) немесе жалын */
function ResultIcon({ test, seen }: { test: UnknownTest; seen: Seen | undefined }) {
  if (test === "flame") {
    const ion = seen?.startsWith("flame") ? seen.slice(5) : "";
    const color = ion in FLAME ? rgb(FLAME[ion as keyof typeof FLAME].c) : "rgb(120,170,255)";
    return (
      <svg viewBox="0 0 40 60" aria-hidden="true" className="h-14 w-9">
        <path d="M20 6 C30 22 32 34 26 46 C23 52 17 52 14 46 C8 34 10 22 20 6Z" fill={seen ? color : "rgb(120,170,255)"} fillOpacity={seen ? 0.85 : 0.25} />
        <rect x="12" y="50" width="16" height="8" rx="2" className="fill-muted-foreground" />
      </svg>
    );
  }
  const ppt = seen ? PPT_FILL[seen] : undefined;
  return (
    <svg viewBox="0 0 40 60" aria-hidden="true" className="h-14 w-9">
      <rect x="12" y="4" width="16" height="52" rx="8" className="fill-panel" />
      <rect x="13.5" y="22" width="13" height="32" rx="6.5" fill="rgba(208,230,242,0.3)" />
      {ppt && <rect x="13.5" y="44" width="13" height="10" rx="5" fill={ppt} />}
      {seen === "gas" &&
        [0, 1, 2, 3].map((i) => (
          <circle key={i} cx={17 + (i % 2) * 6} cy={46 - i * 6} r="1.6" fill="none" stroke="#9EE6F2" className="motion-safe:animate-pulse" />
        ))}
      <rect x="12" y="4" width="16" height="52" rx="8" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
    </svg>
  );
}

/** 4-қадам: X ерітіндісімен бес сынақ (нәтижені сервер береді — X клиентке белгісіз) */
function Experiment({ params, value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const trials = trialsOf(value);
  const seen = lastSeen(trials);
  const [pending, setPending] = useState<UnknownTest | null>(null);
  const [failed, setFailed] = useState(false);

  async function run(test: UnknownTest) {
    setPending(test);
    setFailed(false);
    try {
      const result = await runUnknownTest(params.s, test);
      if (result) onChange({ ...value, tests: [...trials, { test, seen: result }].slice(-60) });
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
      <section className="rounded-3xl border border-line bg-panel-2/50 p-4">
        <p className="mb-3 flex items-center gap-2 font-display font-semibold">
          <span aria-hidden="true" className="grid size-9 place-items-center rounded-xl border border-cyan-dim bg-panel font-mono text-lg">
            X
          </span>
          {t("experiment.bottle")}
        </p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {TESTS.map((test) => {
            const result = seen.get(test);
            return (
              <li key={test}>
                <button
                  type="button"
                  disabled={pending !== null}
                  onClick={() => run(test)}
                  className={cn(
                    "flex min-h-32 w-full flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 text-center text-[0.85rem] transition-colors disabled:opacity-60",
                    result ? "border-cyan-dim bg-cyan/5" : "border-line bg-panel hover:border-cyan-dim",
                  )}
                >
                  <span className="font-semibold">{t(`tests.${test}`)}</span>
                  <ResultIcon test={test} seen={result} />
                  <span className="text-muted-foreground">
                    {pending === test ? t("experiment.running") : result ? t(`seen.${result}`) : t("experiment.run")}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <ModelBadge className="mt-3" />
      </section>
      {failed && (
        <p role="alert" className="text-[0.88rem] text-pink">
          {t("experiment.error")}
        </p>
      )}
      <p aria-live="polite" className="font-mono text-[0.8rem] text-muted-foreground">
        {t("experiment.progress", { count: seen.size, total: TESTS.length })}
      </p>
    </div>
  );
}

/** 5-қадам: әр сынақтың нәтижесі (модель) → қай ион анықталды (оқушы) */
function Observation({ experiment, values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const seen = lastSeen(trialsOf(experiment));
  return (
    <ObservationTable
      hint={t("observationHint")}
      columns={[
        { key: "test", label: t("observation.test"), kind: "auto" },
        { key: "seen", label: t("observation.seen"), kind: "auto", model: true },
        {
          key: "ion",
          label: t("observation.ion"),
          kind: "select",
          options: ION_CHOICES.map((ion) => ({ value: ion, label: ionLabel(ion) ?? t("observation.none") })),
        },
      ]}
      rows={TESTS.map((test, i) => {
        const result = seen.get(test);
        return { id: `r${i}`, cells: { test: t(`tests.${test}`), seen: result ? t(`seen.${result}`) : t("observation.notTested") } };
      })}
      values={values}
      onChange={onChange}
    />
  );
}

function AnalysisData() {
  const t = useTranslations(LAB);
  return (
    <p className="rounded-xl bg-panel-2 px-3.5 py-2.5 text-[0.88rem]">
      {t("data.atomic")} <span className="font-mono">{ATOMIC_MASSES}</span>
    </p>
  );
}

export const unknownModule: LabModule = {
  useTexts,
  initialExperiment: { tests: [] },
  isExperimentDone: (value) => lastSeen(trialsOf(value)).size === TESTS.length,
  Experiment,
  Observation,
  isObservationDone: (_params, _experiment, values) => TESTS.every((_, i) => values[`r${i}.ion`]),
  AnalysisData,
  formatReveal: (key, value, locale) => (key === "molarMass" ? formatDecimal(value, locale as Locale, 2) : null),
};
