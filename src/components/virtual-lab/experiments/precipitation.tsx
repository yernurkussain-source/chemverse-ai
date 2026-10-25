"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { PPT } from "@/features/chem-engine";
import { IONIC_OPTIONS, PRECIPITATION_META, type PrecipitationEquipment } from "@/features/virtual-lab/experiments/precipitation/meta";
import { CELLS, mix, PPT_COLOR, pptFormula, PRECIPITATES, REAGENTS, SALTS, testedCells } from "@/features/virtual-lab/experiments/precipitation/model";
import type { Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.precipitation";

const mixedOf = (value: LabValue): number[] =>
  Array.isArray(value.mixed) ? value.mixed.filter((c): c is number => Number.isInteger(c) && c >= 0 && c < CELLS.length) : [];

const pairLabel = (cell: number) => `${SALTS[CELLS[cell].salt].f} + ${REAGENTS[CELLS[cell].reagent].f}`;

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["goggles", "silver", "noTaste", "waste"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: PRECIPITATION_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: PRECIPITATION_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel: (id) => t(`equipment.${id as PrecipitationEquipment}`),
    questions: [
      {
        id: "ionic",
        kind: "choice",
        label: t("questions.ionic.label"),
        options: PRECIPITATION_META.questions[0].options.map((value) => ({ value, label: IONIC_OPTIONS[value] })),
      },
      {
        id: "silver",
        kind: "choice",
        label: t("questions.silver.label"),
        options: PRECIPITATION_META.questions[1].options.map((value) => ({ value, label: t(`questions.silver.options.${value}`) })),
      },
      { id: "pptMass", kind: "number", label: t("questions.pptMass.label"), unit: t("questions.pptMass.unit") },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => (key === "pptCount" || key === "pptMass" ? t(`reveal.${key}`) : null),
  };
}

const rgb = (c: readonly number[]) => `rgb(${c.map(Math.round).join(",")})`;

/** Пробирка (SVG): ерітіндінің түсі және түбіне шөккен тұнба */
function Tube({ liquid, ppt, dropKey }: { liquid: string; ppt: string | null; dropKey: number }) {
  return (
    <svg viewBox="0 0 40 110" aria-hidden="true" className="h-24 w-9">
      <circle key={dropKey} cx="20" cy="6" r="3.5" fill="#9EE6F2" className={dropKey ? "motion-safe:animate-drop" : "opacity-0"} />
      <rect x="9" y="14" width="22" height="90" rx="11" className="fill-panel" />
      <rect x="11" y="50" width="18" height="52" rx="9" fill={liquid} style={{ transition: "fill 900ms ease" }} />
      {ppt && <rect x="11" y="86" width="18" height="16" rx="8" fill={ppt} className="motion-safe:animate-in motion-safe:fade-in motion-safe:duration-700" />}
      <rect x="9" y="14" width="22" height="90" rx="11" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
    </svg>
  );
}

/** 4-қадам: тұз ерітіндісіне реактив құю (4 × 3 пробирка) */
function Experiment({ value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const mixed = mixedOf(value);
  const results = useMemo(() => CELLS.map((_, i) => mix(i)), []);
  const [last, setLast] = useState<number | null>(null);
  const [dropKey, setDropKey] = useState(0);

  function pour(cell: number) {
    onChange({ ...value, mixed: [...mixed, cell].slice(-60) });
    setLast(cell);
    setDropKey((k) => k + 1);
  }

  const seen = (cell: number) => {
    const ppt = results[cell].ppt;
    return ppt ? t(`seen.${PPT_COLOR[ppt]}`) : t("seen.none");
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
      <section className="overflow-x-auto rounded-3xl border border-line bg-panel-2/50 p-3 sm:p-4">
        <table className="mx-auto border-separate border-spacing-1 text-center">
          <thead>
            <tr>
              <th className="font-mono text-[0.75rem] font-normal text-muted-foreground">{t("experiment.corner")}</th>
              {REAGENTS.map((r) => (
                <th key={r.id} scope="col" className="font-mono text-[0.85rem]">
                  {r.f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SALTS.map((s, salt) => (
              <tr key={s.id}>
                <th scope="row" className="pr-1 text-right font-mono text-[0.85rem]">
                  {s.f}
                </th>
                {REAGENTS.map((r, reagent) => {
                  const cell = salt * REAGENTS.length + reagent;
                  const done = mixed.includes(cell);
                  const { liquid, ppt } = results[cell];
                  return (
                    <td key={r.id}>
                      <button
                        type="button"
                        onClick={() => pour(cell)}
                        aria-label={`${pairLabel(cell)}${done ? ` — ${seen(cell)}` : ""}`}
                        className={cn(
                          "rounded-2xl px-1.5 pt-1 transition-colors",
                          last === cell ? "bg-cyan/10 ring-1 ring-cyan" : "hover:bg-panel",
                        )}
                      >
                        <Tube
                          liquid={done ? `rgba(${liquid.r},${liquid.g},${liquid.b},${Math.max(liquid.a, 0.25)})` : "rgba(208,230,242,0.3)"}
                          ppt={done && ppt ? rgb(PPT[ppt].col) : null}
                          dropKey={last === cell ? dropKey : 0}
                        />
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
            <span className="font-mono">{pairLabel(last)}</span> → {seen(last)}
          </>
        )}
      </div>

      <div>
        <h3 className="mb-1.5 flex flex-wrap items-baseline justify-between gap-2 font-display text-[0.95rem] font-semibold">
          {t("experiment.log")}
          <span className="font-mono text-[0.8rem] font-normal text-muted-foreground">
            {t("experiment.progress", { count: testedCells(mixed), total: CELLS.length })}
          </span>
        </h3>
        {mixed.length === 0 ? (
          <p className="text-[0.85rem] text-muted-foreground">{t("experiment.empty")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {[...new Set(mixed)].map((cell) => (
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

/** 5-қадам: әр пробиркада байқалған өзгеріс (модель) және тұнбаның формуласы (оқушы) */
function Observation({ experiment, values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const mixed = new Set(mixedOf(experiment));
  return (
    <ObservationTable
      hint={t("observationHint")}
      columns={[
        { key: "pair", label: t("observation.pair"), kind: "auto" },
        { key: "seen", label: t("observation.seen"), kind: "auto", model: true },
        {
          key: "ppt",
          label: t("observation.ppt"),
          kind: "select",
          options: [{ value: "none", label: t("observation.none") }, ...PRECIPITATES.map((p) => ({ value: p, label: pptFormula(p) }))],
        },
      ]}
      rows={CELLS.map((_, i) => {
        const ppt = mix(i).ppt;
        return {
          id: `r${i}`,
          cells: {
            pair: pairLabel(i),
            seen: mixed.has(i) ? (ppt ? t(`seen.${PPT_COLOR[ppt]}`) : t("seen.none")) : t("observation.notTested"),
          },
        };
      })}
      values={values}
      onChange={onChange}
    />
  );
}

export const precipitationModule: LabModule = {
  useTexts,
  initialExperiment: { mixed: [] },
  isExperimentDone: (value) => testedCells(mixedOf(value)) === CELLS.length,
  Experiment,
  Observation,
  isObservationDone: (_params, _experiment, values) => CELLS.every((_, i) => values[`r${i}.ppt`]),
  formatReveal: (key, value, locale) => {
    if (key === "pptCount") return `${value}/${CELLS.length}`;
    if (key === "pptMass") return `${formatDecimal(value, locale as Locale, 2)} г`;
    return null;
  },
};
