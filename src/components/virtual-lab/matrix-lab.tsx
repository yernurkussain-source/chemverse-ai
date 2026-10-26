"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { logOf, matrixDone, matrixProgress, rowResults, type MatrixMeta, type MatrixSpec, type MatrixVisual } from "@/features/virtual-lab/matrix/spec";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "./module";
import { ModelBadge } from "./parts";
import { ObservationTable } from "./step-forms";

/** Тәжірибенің аудармалары: кілт динамикалық (labs.<slug>.…), сондықтан түрі жеңілдетілген */
type T = ((key: string, values?: Record<string, string | number>) => string) & { has: (key: string) => boolean };

const useLabT = (slug: string) => useTranslations(`ChemLab.labs.${slug}` as "ChemLab") as unknown as T;
/** Аудармасы бар болса — аударма, жоқ болса — id-дің өзі (формула, сан) */
const label = (t: T, key: string, fallback: string) => (t.has(key) ? t(key) : fallback);

/** Сынақтың нәтижесінің шағын суреті */
function Visual({ v }: { v: MatrixVisual }) {
  if (v.kind === "icon") return <span aria-hidden="true" className="text-2xl leading-none">{v.icon}</span>;
  if (v.kind === "swatch") return <span aria-hidden="true" className="size-7 rounded-full border border-line" style={{ background: v.color }} />;
  if (v.kind === "flame")
    return (
      <svg viewBox="0 0 30 40" aria-hidden="true" className="h-10 w-7">
        <path d="M15 3 C23 15 25 25 20 33 C17 38 13 38 10 33 C5 25 7 15 15 3Z" fill={v.color} fillOpacity={0.85} />
      </svg>
    );
  if (v.kind === "lamp")
    return (
      <svg viewBox="0 0 30 40" aria-hidden="true" className="h-10 w-7">
        <circle cx="15" cy="15" r="11" fill="#ffd84a" fillOpacity={0.08 + 0.92 * v.level} stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
        <rect x="10" y="27" width="10" height="9" rx="2" className="fill-muted-foreground" />
      </svg>
    );
  return (
    <svg viewBox="0 0 30 50" aria-hidden="true" className="h-12 w-7">
      <rect x="8" y="3" width="14" height="44" rx="7" className="fill-panel" />
      <rect x="9.5" y="20" width="11" height="25" rx="5.5" fill={v.liquid ?? "rgba(208,230,242,0.3)"} />
      {v.ppt && <rect x="9.5" y="37" width="11" height="8" rx="4" fill={v.ppt} />}
      {v.gas &&
        [0, 1, 2].map((i) => <circle key={i} cx={13 + (i % 2) * 4} cy={34 - i * 5} r="1.5" fill="none" stroke="#9EE6F2" className="motion-safe:animate-pulse" />)}
      <rect x="8" y="3" width="14" height="44" rx="7" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" />
    </svg>
  );
}

/**
 * «Матрица» тәжірибесінің клиенттік модулі (features/virtual-lab/matrix/spec.ts): әр жол — карточка,
 * ішінде сынақ (не нұсқа) батырмалары; басқанда модель бақылауды көрсетеді.
 */
export function makeMatrixModule({ slug, spec, meta }: { slug: string; spec: MatrixSpec; meta: MatrixMeta }): LabModule {
  const logIn = (value: LabValue) => logOf(spec, value.log);
  const rowName = (t: T, row: number) => label(t, `rows.${spec.rows[row]}`, spec.rows[row]);
  const testName = (t: T, test: string) => label(t, `tests.${test}`, test);
  const seenText = (t: T, r: { seen: string; values?: Record<string, string | number> }) => t(`seen.${r.seen}`, r.values);

  function useTexts(): LabTexts {
    const t = useLabT(slug);
    return {
      goal: t("goal"),
      theory: t("theory"),
      safety: meta.safety.map((rule) => t(`safety.${rule}`)),
      predictionQuestion: t("prediction.question"),
      predictions: meta.predictions.map((value) => ({ value, label: label(t, `prediction.options.${value}`, value) })),
      equipment: meta.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
      equipmentHint: meta.equipmentHint ? t("equipmentHint") : undefined,
      equipmentLabel: (id) => label(t, `equipment.${id}`, id),
      questions: meta.questions.map((q) =>
        q.kind === "number"
          ? { id: q.id, kind: "number", label: t(`questions.${q.id}.label`), unit: q.unit ? t(`questions.${q.id}.unit`) : undefined }
          : {
              id: q.id,
              kind: "choice",
              label: t(`questions.${q.id}.label`),
              options: q.options.map((value) => ({ value, label: label(t, `questions.${q.id}.options.${value}`, value) })),
            },
      ),
      conclusionHint: t("conclusionHint"),
      revealLabel: (key) => (meta.reveal?.includes(key) ? t(`reveal.${key}`) : null),
    };
  }

  function Experiment({ value, onChange }: ExperimentProps) {
    const t = useLabT(slug);
    const tm = useTranslations("ChemLab.matrix");
    const log = logIn(value);
    const [last, setLast] = useState<[number, string] | null>(null);
    const progress = matrixProgress(spec, log);

    function run(row: number, test: string) {
      onChange({ ...value, log: [...log, [row, test]].slice(-400) });
      setLast([row, test]);
    }

    return (
      <div className="flex flex-col gap-4">
        <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
        <ul className="grid gap-3 sm:grid-cols-2">
          {spec.rows.map((id, row) => {
            const done = rowResults(spec, log, row);
            const solved = done.some((r) => r.ok);
            return (
              <li key={id} className={cn("rounded-2xl border bg-panel-2/50 p-3", solved ? "border-good" : "border-line")}>
                <p className="mb-2 font-display font-semibold">{rowName(t, row)}</p>
                <div className="flex flex-wrap gap-2">
                  {spec.tests(row).map((test) => {
                    const r = done.find((d) => d.test === test);
                    const isLast = last?.[0] === row && last[1] === test;
                    return (
                      <button
                        key={test}
                        type="button"
                        onClick={() => run(row, test)}
                        className={cn(
                          "flex min-h-11 max-w-full items-center gap-2 rounded-xl border px-2.5 py-1.5 text-left text-[0.85rem] transition-colors",
                          r?.ok === true ? "border-good bg-good/10" : r?.ok === false ? "border-pink/60 bg-pink/5" : r ? "border-cyan-dim bg-cyan/5" : "border-line bg-panel hover:border-cyan-dim",
                          isLast && "ring-1 ring-cyan",
                        )}
                      >
                        {r?.visual && <Visual v={r.visual} />}
                        <span className="min-w-0">
                          <b className="block font-semibold">{testName(t, test)}</b>
                          {r && <span className="text-muted-foreground">{seenText(t, r)}</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <ModelBadge />
          <p aria-live="polite" className="font-mono text-[0.8rem] text-muted-foreground">
            {spec.mode === "explore"
              ? tm("progress", { count: progress.tested, total: progress.total })
              : tm("solved", { count: progress.solved, total: spec.rows.length })}
          </p>
        </div>
      </div>
    );
  }

  function Observation({ experiment, values, onChange }: ObservationProps) {
    const t = useLabT(slug);
    const tm = useTranslations("ChemLab.matrix");
    const log = logIn(experiment);
    const own = meta.observationRows;
    const rows = own
      ? own.map((id, i) => ({ id: `r${i}`, cells: { row: t(`observation.rows.${id}`) } }))
      : spec.rows.map((_, row) => {
          const results = rowResults(spec, log, row).filter((r) => spec.mode === "explore" || r.ok);
          const seen = results.length
            ? results.map((r) => (spec.mode === "explore" ? `${testName(t, r.test)}: ${seenText(t, r)}` : `${testName(t, r.test)} — ${seenText(t, r)}`)).join("; ")
            : tm("notTested");
          return { id: `r${row}`, cells: { row: rowName(t, row), seen } };
        });
    return (
      <ObservationTable
        hint={t("observationHint")}
        columns={[
          { key: "row", label: t("observation.row"), kind: "auto" },
          ...(own ? [] : [{ key: "seen", label: tm("seen"), kind: "auto" as const, model: true }]),
          ...meta.columns.map((c) =>
            c.kind === "text"
              ? { key: c.key, label: t(`columns.${c.key}.label`), kind: "text" as const, inputMode: "decimal" as const }
              : {
                  key: c.key,
                  label: t(`columns.${c.key}.label`),
                  kind: "select" as const,
                  options: c.options.map((value) => ({ value, label: label(t, `columns.${c.key}.options.${value}`, value) })),
                },
          ),
        ]}
        rows={rows}
        values={values}
        onChange={onChange}
      />
    );
  }

  const observationRows = meta.observationRows?.length ?? spec.rows.length;
  return {
    useTexts,
    initialExperiment: { log: [] },
    isExperimentDone: (value) => matrixDone(spec, logIn(value)),
    Experiment,
    Observation,
    isObservationDone: (_params, _experiment, values) =>
      Array.from({ length: observationRows }).every((_, i) => meta.columns.every((c) => values[`r${i}.${c.key}`]?.trim())),
    formatReveal: (_key, value, locale) => formatDecimal(value, locale as Locale, Number.isInteger(value) ? 0 : 2),
  };
}
