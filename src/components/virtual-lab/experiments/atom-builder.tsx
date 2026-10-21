"use client";

import { useLocale, useTranslations } from "next-intl";
import { ATOM_META, type AtomEquipment } from "@/features/virtual-lab/experiments/atom-builder/meta";
import { ATOM_GOALS, describe, LIMITS, particleSymbol, type AtomGoalId, type Particles } from "@/features/virtual-lab/experiments/atom-builder/model";
import type { Locale } from "@/i18n/routing";
import { getElement } from "@/lib/chemistry/elements";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.atom-builder";

type AtomValue = { goals: Record<AtomGoalId, Particles | null>; current: Particles; active: AtomGoalId };

const isParticles = (v: unknown): v is Particles =>
  typeof v === "object" && v !== null && ["p", "n", "e"].every((k) => typeof (v as Record<string, unknown>)[k] === "number");

function asValue(value: LabValue): AtomValue {
  const goals = (typeof value.goals === "object" && value.goals ? value.goals : {}) as Record<string, unknown>;
  return {
    goals: Object.fromEntries(ATOM_GOALS.map((g) => [g.id, isParticles(goals[g.id]) ? goals[g.id] : null])) as AtomValue["goals"],
    current: isParticles(value.current) ? value.current : { p: 1, n: 0, e: 1 },
    active: ATOM_GOALS.some((g) => g.id === value.active) ? (value.active as AtomGoalId) : "carbon12",
  };
}

const shellText = (shells: number[]) => (shells.length ? shells.join(", ") : "—");

function useTexts(): LabTexts {
  const t = useTranslations(LAB);
  return {
    goal: t("goal"),
    theory: t("theory"),
    safety: (["model", "radioactive", "screen"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: ATOM_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: ATOM_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentHint: t("equipmentHint"),
    equipmentLabel: (id) => t(`equipment.${id as AtomEquipment}`),
    questions: [
      {
        id: "identity",
        kind: "choice",
        label: t("questions.identity.label"),
        options: (["neutrons", "protons", "electrons", "mass"] as const).map((value) => ({ value, label: t(`questions.identity.options.${value}`) })),
      },
      {
        id: "magnesium",
        kind: "choice",
        label: t("questions.magnesium.label"),
        options: ["2,10", "2,8,2", "2,8,1,1", "8,4"].map((value) => ({ value, label: value.replace(/,/g, ", ") })),
      },
      { id: "oxideElectrons", kind: "number", label: t("questions.oxideElectrons.label") },
    ],
    conclusionHint: t("conclusionHint"),
    revealLabel: (key) => (key === "goalsRight" ? t("reveal.goalsRight") : null),
  };
}

/** 2D атом (Бор моделі): ядро — протондар (қызыл) мен нейтрондар (сұр), айналасында электрон қабаттары */
function AtomDrawing({ particles }: { particles: Particles }) {
  const { shells } = describe(particles);
  const total = particles.p + particles.n;
  // Ядро бөлшектері «күнбағыс» үлгісімен; протондар мен нейтрондар біркелкі араласады
  const nucleus = Array.from({ length: total }, (_, i) => ({
    x: 140 + 5.4 * Math.sqrt(i) * Math.cos(i * 2.39996),
    y: 140 + 5.4 * Math.sqrt(i) * Math.sin(i * 2.39996),
    proton: Math.floor(((i + 1) * particles.p) / total) > Math.floor((i * particles.p) / total),
  }));
  const radii = [52, 76, 100, 124];

  return (
    <svg viewBox="0 0 280 280" role="img" aria-label={particleSymbol(particles) ?? "—"} className="mx-auto h-auto w-full max-w-72">
      {radii.slice(0, Math.max(shells.length, 1)).map((r) => (
        <circle key={r} cx="140" cy="140" r={r} fill="none" stroke="currentColor" strokeDasharray="3 4" className="text-line" strokeWidth="1.5" />
      ))}
      {nucleus.map((dot, i) => (
        <circle key={i} cx={dot.x} cy={dot.y} r="5" fill={dot.proton ? "#e2475b" : "#9aa3b5"} stroke="#fff" strokeWidth="0.8" />
      ))}
      {shells.map((count, s) =>
        Array.from({ length: count }, (_, k) => {
          const angle = (2 * Math.PI * k) / count - Math.PI / 2 + s * 0.35;
          return <circle key={`${s}-${k}`} cx={140 + radii[s] * Math.cos(angle)} cy={140 + radii[s] * Math.sin(angle)} r="5" fill="#3b82f6" stroke="#fff" strokeWidth="0.8" />;
        }),
      )}
    </svg>
  );
}

function Counter({ label, color, value, max, onChange }: { label: string; color: string; value: number; max: number; onChange: (v: number) => void }) {
  const t = useTranslations(`${LAB}.particles`);
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl bg-panel-2 px-3 py-2">
      <span className="flex items-center gap-2 text-[0.9rem] font-semibold">
        <span aria-hidden="true" className="size-3 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="flex items-center gap-1.5">
        <button
          type="button"
          aria-label={`${t("minus")}: ${label}`}
          disabled={value <= 0}
          onClick={() => onChange(value - 1)}
          className="grid size-10 place-items-center rounded-xl border border-line bg-panel text-lg font-bold disabled:opacity-40"
        >
          −
        </button>
        <output className="w-8 text-center font-mono text-lg font-semibold tabular-nums">{value}</output>
        <button
          type="button"
          aria-label={`${t("plus")}: ${label}`}
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          className="grid size-10 place-items-center rounded-xl border border-line bg-panel text-lg font-bold disabled:opacity-40"
        >
          +
        </button>
      </span>
    </div>
  );
}

/** 4-қадам: бөлшектерді қосып-азайтып, 3 мақсатты құрастыру */
function Experiment({ value: raw, onChange }: ExperimentProps) {
  const t = useTranslations(LAB);
  const locale = useLocale() as Locale;
  const value = asValue(raw);
  const { current } = value;
  const info = describe(current);
  const element = info.element ? getElement(info.element.symbol) : undefined;
  const set = (patch: Partial<Particles>) => onChange({ ...value, current: { ...current, ...patch } });

  function save() {
    const goals = { ...value.goals, [value.active]: { ...current } };
    const next = ATOM_GOALS.find((g) => !goals[g.id])?.id ?? value.active;
    onChange({ ...value, goals, active: next });
  }

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-panel-2/50 p-4">
        <AtomDrawing particles={current} />
        <p className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted-foreground">
          <ModelBadge /> {t("bohrNote")}
        </p>
        <dl className="m-0 grid grid-cols-2 gap-2 text-[0.85rem]">
          <div className="col-span-2 rounded-xl bg-panel px-3 py-2">
            <dt className="text-[0.75rem] text-muted-foreground">{t("info.element")}</dt>
            <dd className="m-0 font-semibold">
              {info.symbol ? (
                <>
                  <span className="font-mono text-lg">{info.symbol}</span> · {element?.name[locale]} (Z = {current.p})
                </>
              ) : (
                <span className="text-muted-foreground">{t("info.noElement")}</span>
              )}
            </dd>
          </div>
          <div className="rounded-xl bg-panel px-3 py-2">
            <dt className="text-[0.75rem] text-muted-foreground">{t("info.massNumber")}</dt>
            <dd className="m-0 font-mono font-semibold">{info.massNumber}</dd>
          </div>
          <div className="rounded-xl bg-panel px-3 py-2">
            <dt className="text-[0.75rem] text-muted-foreground">{t("info.charge")}</dt>
            <dd className="m-0 font-semibold">
              <span className="font-mono">{info.charge > 0 ? `+${info.charge}` : info.charge}</span> · {t(`info.kind.${info.kind}`)}
            </dd>
          </div>
          <div className="rounded-xl bg-panel px-3 py-2">
            <dt className="text-[0.75rem] text-muted-foreground">{t("info.shells")}</dt>
            <dd className="m-0 font-mono font-semibold">{shellText(info.shells)}</dd>
          </div>
          <div className={cn("rounded-xl px-3 py-2 text-[0.8rem]", info.stableIsotope ? "bg-good/10 text-good" : "bg-amber/10 text-amber")}>
            {info.element ? (info.stableIsotope ? t("info.stable") : t("info.rare")) : "—"}
          </div>
        </dl>
      </section>

      <section className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-2">
          <Counter label={t("particles.p")} color="#e2475b" value={current.p} max={LIMITS.p} onChange={(p) => set({ p })} />
          <Counter label={t("particles.n")} color="#9aa3b5" value={current.n} max={LIMITS.n} onChange={(n) => set({ n })} />
          <Counter label={t("particles.e")} color="#3b82f6" value={current.e} max={LIMITS.e} onChange={(e) => set({ e })} />
        </div>

        <div className="rounded-2xl border border-line p-3">
          <h3 className="font-display font-semibold">{t("goals.title")}</h3>
          <p className="mb-2 text-[0.82rem] text-muted-foreground">{t("goals.hint")}</p>
          <ul role="radiogroup" aria-label={t("goals.title")} className="flex flex-col gap-1.5">
            {ATOM_GOALS.map((goal) => {
              const saved = value.goals[goal.id];
              const active = value.active === goal.id;
              return (
                <li key={goal.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onChange({ ...value, active: goal.id })}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-2 text-left text-[0.9rem]",
                      active ? "border-cyan bg-cyan/10 font-semibold" : "border-line bg-panel-2",
                    )}
                  >
                    <span>{t(`goals.${goal.id}`)}</span>
                    <span className={cn("shrink-0 font-mono text-[0.8rem]", saved ? "text-good" : "text-muted-foreground")}>
                      {saved ? `✓ ${particleSymbol(saved) ?? "—"}` : t("goals.notSaved")}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={save}
            className="mt-2.5 w-full rounded-full bg-cyan px-4 py-2.5 font-semibold text-on-accent transition-opacity hover:opacity-90"
          >
            {t("goals.save")} → {t(`goals.${value.active}`)}
          </button>
        </div>
      </section>
    </div>
  );
}

/** 5-қадам: әр құрастырылған бөлшекке A, заряд және электрон қабаттары (оқушы жазады) */
function Observation({ experiment, values, onChange }: ObservationProps) {
  const t = useTranslations(LAB);
  const { goals } = asValue(experiment);
  return (
    <ObservationTable
      columns={[
        { key: "goal", label: t("observation.goal"), kind: "auto" },
        { key: "built", label: t("observation.built"), kind: "auto", model: true },
        { key: "mass", label: t("observation.mass"), kind: "text", inputMode: "decimal", placeholder: "12" },
        {
          key: "charge",
          label: t("observation.charge"),
          kind: "select",
          options: ATOM_META.charges.map((c) => ({ value: c, label: t(`observation.charges.${c}`) })),
        },
        { key: "shells", label: t("observation.shells"), kind: "text", placeholder: t("observation.shellsPlaceholder") },
      ]}
      rows={ATOM_GOALS.map((goal, i) => {
        const built = goals[goal.id];
        return {
          id: `r${i}`,
          disabled: !built,
          cells: {
            goal: t(`goals.${goal.id}`),
            built: built ? `${particleSymbol(built) ?? "—"} (p ${built.p}, n ${built.n}, e ${built.e})` : t("observation.notBuilt"),
          },
        };
      })}
      values={values}
      onChange={onChange}
      hint={t("observationHint")}
    />
  );
}

export const atomModule: LabModule = {
  useTexts,
  initialExperiment: { goals: { carbon12: null, sodiumIon: null, chlorideIon: null }, current: { p: 1, n: 0, e: 1 }, active: "carbon12" },
  isExperimentDone: (value) => ATOM_GOALS.every((g) => asValue(value).goals[g.id]),
  Experiment,
  Observation,
  isObservationDone: (_params, experiment, values) => {
    const { goals } = asValue(experiment);
    return ATOM_GOALS.every((g, i) => !goals[g.id] || (values[`r${i}.mass`]?.trim() && values[`r${i}.charge`] && values[`r${i}.shells`]?.trim()));
  },
  formatReveal: (key, value) => (key === "goalsRight" ? `${value} / ${ATOM_GOALS.length}` : null),
};

