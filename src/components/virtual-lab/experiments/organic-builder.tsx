"use client";

import { useTranslations } from "next-intl";
import { MoleculeBuilder } from "@/components/molecules/molecule-builder";
import { ORGANIC_BUILDER_META, type OrganicBuilderEquipment } from "@/features/virtual-lab/experiments/organic-builder/meta";
import { CLASSES, foundOf, TARGETS } from "@/features/virtual-lab/experiments/organic-builder/model";
import { getMolecule, molecularFormula } from "@/lib/chemistry/molecules";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.organic-builder";
const formulaOf = (id: (typeof TARGETS)[number]) => molecularFormula(getMolecule(id)!.atoms);

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["model", "valence", "real"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: ORGANIC_BUILDER_META.predictions.map((value) => ({ value, label: value })),
    equipment: ORGANIC_BUILDER_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentHint: t("equipmentHint"),
    equipmentLabel: (id) => t(`equipment.${id as OrganicBuilderEquipment}`),
    questions: [
      {
        id: "isomers",
        kind: "choice",
        label: t("questions.isomers.label"),
        options: ORGANIC_BUILDER_META.questions[0].options.map((value) => ({ value, label: t(`questions.isomers.options.${value}`) })),
      },
      {
        id: "sodium",
        kind: "choice",
        label: t("questions.sodium.label"),
        options: ORGANIC_BUILDER_META.questions[1].options.map((value) => ({ value, label: t(`questions.sodium.options.${value}`) })),
      },
      { id: "molarMass", kind: "number", label: t("questions.molarMass.label"), unit: t("questions.molarMass.unit") },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => (key === "built" ? t("reveal.built") : null),
  };
}

/** 4-қадам: изомерлерді құрастыру (молекула құрастырушы затты өзі таниды) */
function Experiment({ value, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const tm = useTranslations("Molecules");
  const found = foundOf(value.found);
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("experiment.hint")}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {TARGETS.map((id) => (
          <li key={id} className={cn("rounded-xl border px-3 py-2 text-[0.88rem]", found.includes(id) ? "border-good bg-good/10" : "border-line bg-panel-2")}>
            <b className="font-mono">{formulaOf(id)}</b> · {tm(`${id}.name`)} {found.includes(id) && "✓"}
          </li>
        ))}
      </ul>
      <MoleculeBuilder
        tasks={TARGETS}
        onFound={(id) => {
          if ((TARGETS as readonly string[]).includes(id) && !found.includes(id as (typeof TARGETS)[number])) onChange({ ...value, found: [...found, id] });
        }}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ModelBadge />
        <p aria-live="polite" className="font-mono text-[0.8rem] text-muted-foreground">
          {t("experiment.progress", { count: found.length, total: TARGETS.length })}
        </p>
      </div>
    </div>
  );
}

/** 5-қадам: әр заттың класы */
function Observation({ values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const tm = useTranslations("Molecules");
  return (
    <ObservationTable
      hint={t("observationHint")}
      columns={[
        { key: "molecule", label: t("observation.molecule"), kind: "auto" },
        { key: "class", label: t("observation.class"), kind: "select", options: CLASSES.map((c) => ({ value: c, label: t(`classes.${c}`) })) },
      ]}
      rows={TARGETS.map((id, i) => ({ id: `r${i}`, cells: { molecule: `${formulaOf(id)} — ${tm(`${id}.name`)}` } }))}
      values={values}
      onChange={onChange}
    />
  );
}

export const organicBuilderModule: LabModule = {
  useTexts,
  initialExperiment: { found: [] },
  isExperimentDone: (value) => foundOf(value.found).length === TARGETS.length,
  Experiment,
  Observation,
  isObservationDone: (_params, _experiment, values) => TARGETS.every((_, i) => values[`r${i}.class`]),
  formatReveal: (_key, value) => `${value}/${TARGETS.length}`,
};
