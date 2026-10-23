"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { RATE_META, type RateEquipment } from "@/features/virtual-lab/experiments/reaction-rate/meta";
import {
  bothChanged,
  CONCENTRATIONS,
  gammaOf,
  halfLife,
  isValidRun,
  MAX_RUNS,
  RATE,
  TEMPERATURES,
  vMaxMl,
  volumeAt,
  type Run,
} from "@/features/virtual-lab/experiments/reaction-rate/model";
import type { Locale } from "@/i18n/routing";
import { formatDecimal, formatShort } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { ExperimentProps, LabModule, LabParams, LabTexts, LabValue, ObservationProps } from "../module";
import { ModelBadge } from "../parts";
import { ObservationTable } from "../step-forms";

const LAB = "ChemLab.labs.reaction-rate";
/** Жүгіртілімдердің түсі (графикте және тізімде) */
const RUN_COLORS = ["text-cyan", "text-pink", "text-amber", "text-blue"] as const;
/** 300 секунд модель уақыты экранда осынша миллисекундта өтеді */
const ANIMATION_MS = 5000;

const runsOf = (value: LabValue): Run[] =>
  Array.isArray(value.runs) ? value.runs.filter((r): r is Run => typeof r === "object" && r !== null && isValidRun(r as Run)).slice(0, MAX_RUNS) : [];

function useTexts(params?: LabParams): LabTexts {
  const t = useTranslations(LAB);
  const advanced = params?.level === 10;
  const revealKeys = ["level", "vMaxMl", "gamma", "predictHalfLife", "violations"] as const;
  return {
    goal: advanced ? t("advanced.goal") : t("goal"),
    // 10-сыныптың теориясы — бөлек абзац
    theory: advanced ? `${t("theory")}

${t("advanced.theory")}` : t("theory"),
    levels: ([9, 10] as const).map((level) => ({ value: level, label: t(`levels.${level}.label`), text: t(`levels.${level}.text`) })),
    safety: (["flammable", "acid", "vent", "model"] as const).map((rule) => t(`safety.${rule}`)),
    predictionQuestion: t("prediction.question"),
    predictions: RATE_META.predictions.map((value) => ({ value, label: t(`prediction.options.${value}`) })),
    equipment: RATE_META.equipment.map((id) => ({ id, label: t(`equipment.${id}`) })),
    equipmentLabel: (id) => t(`equipment.${id as RateEquipment}`),
    questions: advanced
      ? [
          { id: "gammaFound", kind: "number", label: t("advanced.questions.gammaFound") },
          { id: "order", kind: "number", label: t("advanced.questions.order") },
          { id: "predictHalfLife", kind: "number", label: t("advanced.questions.predictHalfLife"), unit: "с" },
        ]
      : [
      { id: "tempFactor", kind: "number", label: t("questions.tempFactor.label") },
      {
        id: "halfLife",
        kind: "choice",
        label: t("questions.halfLife.label"),
        options: (["doubled", "halved", "same", "quartered"] as const).map((value) => ({ value, label: t(`questions.halfLife.options.${value}`) })),
      },
      {
        id: "finalVolume",
        kind: "choice",
        label: t("questions.finalVolume.label"),
        options: (["acidRunsOut", "syringeFull", "mgLimiting", "sameTemp"] as const).map((value) => ({
          value,
          label: t(`questions.finalVolume.options.${value}`),
        })),
      },
    ],
    conclusionHint: advanced ? t("advanced.conclusionHint") : t("conclusionHint"),
    revealLabel: (key) => ((revealKeys as readonly string[]).includes(key) ? t(`reveal.${key as (typeof revealKeys)[number]}`) : null),
    formatRevealValue: (key, value) => (key === "level" && (value === 9 || value === 10) ? t(`levels.${value}.short`) : null),
  };
}

/** V(t) графигі: әр жүгіртілім өз түсімен; t = 30 с — пунктир (оқушы V(30 с) мәнін осыдан оқиды) */
function Graph({ runs, running, gamma }: { runs: Run[]; running: { run: Run; t: number; color: string } | null; gamma: number }) {
  const t = useTranslations(`${LAB}.experiment`);
  const W = 340;
  const H = 210;
  const x = (sec: number) => 38 + (sec / RATE.durationSec) * (W - 50);
  const y = (ml: number) => H - 28 - (ml / 50) * (H - 44);
  const line = (run: Run, until: number = RATE.durationSec) =>
    Array.from({ length: Math.floor(until / 3) + 1 }, (_, i) => Math.min(i * 3, until))
      .map((sec) => `${x(sec).toFixed(1)},${y(volumeAt(run, sec, gamma)).toFixed(1)}`)
      .join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${t("volume")} / ${t("time")}`} className="h-auto w-full">
      {[0, 10, 20, 30, 40, 50].map((ml) => (
        <g key={ml}>
          <line x1={x(0)} x2={x(RATE.durationSec)} y1={y(ml)} y2={y(ml)} stroke="currentColor" className="text-line" strokeWidth="1" />
          <text x={x(0) - 6} y={y(ml) + 3.5} textAnchor="end" fontSize="9" className="fill-muted-foreground font-mono">
            {ml}
          </text>
        </g>
      ))}
      {[0, 60, 120, 180, 240, 300].map((sec) => (
        <text key={sec} x={x(sec)} y={H - 14} textAnchor="middle" fontSize="9" className="fill-muted-foreground font-mono">
          {sec}
        </text>
      ))}
      <text x={W - 10} y={H - 2} textAnchor="end" fontSize="9" className="fill-muted-foreground font-mono">
        {t("time")}
      </text>
      <text x={6} y={10} fontSize="9" className="fill-muted-foreground font-mono">
        {t("volume")}
      </text>
      <line x1={x(RATE.readAtSec)} x2={x(RATE.readAtSec)} y1={y(50)} y2={y(0)} stroke="currentColor" strokeDasharray="4 4" className="text-muted-foreground" />
      {runs.map((run, i) => (
        <polyline key={i} points={line(run)} fill="none" stroke="currentColor" strokeWidth="2.5" className={RUN_COLORS[i]} />
      ))}
      {running && <polyline points={line(running.run, running.t)} fill="none" stroke="currentColor" strokeWidth="2.5" className={running.color} />}
    </svg>
  );
}

/** Газ шприці мен колба: поршень бөлінген H₂ көлеміне қарай жылжиды */
function Apparatus({ fraction, bubbling }: { fraction: number; bubbling: boolean }) {
  const t = useTranslations(`${LAB}.experiment`);
  return (
    <svg viewBox="0 0 300 110" role="img" aria-label={t("syringe")} className="h-auto w-full max-w-md">
      {/* Колба: HCl ерітіндісі және магний таспасы */}
      <path d="M30 20 h24 v24 l20 46 a8 8 0 0 1 -7 11 h-50 a8 8 0 0 1 -7 -11 l20 -46 z" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
      <path d="M22 72 h40 l8 18 a6 6 0 0 1 -5 9 h-46 a6 6 0 0 1 -5 -9 z" fill="#9fdcf2" opacity="0.55" />
      <rect x="34" y="86" width="16" height="4" rx="1" fill="#9aa3b5" />
      {bubbling &&
        [0, 1, 2, 3, 4].map((i) => (
          <circle key={i} cx={36 + i * 3.5} cy={80 - (i % 3) * 5} r="1.8" fill="#fff" stroke="#7cc9ec" className="motion-safe:animate-pulse" />
        ))}
      {/* Түтік және шприц */}
      <path d="M42 20 V10 H110" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
      <rect x="110" y="2" width="170" height="16" rx="3" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
      <rect x="112" y="4" width={Math.max(0, fraction) * 160} height="12" fill="#cfeaf6" />
      <rect x={112 + Math.max(0, fraction) * 160} y="0" width="5" height="20" className="fill-muted-foreground" />
      <line x1={117 + Math.max(0, fraction) * 160} y1="10" x2="296" y2="10" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" />
      <text x="195" y="38" textAnchor="middle" fontSize="10" className="fill-muted-foreground">
        {t("syringe")}
      </text>
    </svg>
  );
}

function Experiment({ params, value, onChange }: ExperimentProps) {
  const gamma = gammaOf(params);
  const advanced = params.level === 10;
  const t = useTranslations(`${LAB}.experiment`);
  const locale = useLocale() as Locale;
  const runs = runsOf(value);
  const last = runs.at(-1);
  const [T, setT] = useState<number>(last?.T ?? 20);
  const [c, setC] = useState<number>(last?.c ?? 1);
  const [simTime, setSimTime] = useState<number | null>(null);
  const frame = useRef<number | undefined>(undefined);
  const current: Run = { T, c };
  const warn = bothChanged(last, current);
  const running = simTime !== null;
  const color = RUN_COLORS[Math.min(runs.length, RUN_COLORS.length - 1)];

  useEffect(() => () => window.cancelAnimationFrame(frame.current ?? 0), []);

  function start() {
    const finish = () => {
      setSimTime(null);
      onChange({ ...value, runs: [...runs, current] });
    };
    // Қозғалысты азайту баптауы қосулы болса — анимациясыз бірден нәтиже
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    // Бастапқы уақыт — бірінші кадрдың уақыты (requestAnimationFrame береді)
    let started: number | null = null;
    const tick = (now: number) => {
      started ??= now;
      const sec = Math.min(1, (now - started) / ANIMATION_MS) * RATE.durationSec;
      setSimTime(sec);
      if (sec < RATE.durationSec) frame.current = window.requestAnimationFrame(tick);
      else finish();
    };
    frame.current = window.requestAnimationFrame(tick);
  }

  const liveVolume = running ? volumeAt(current, simTime, gamma) : last ? volumeAt(last, RATE.durationSec, gamma) : 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.9rem] text-muted-foreground">{t("hint")}</p>
      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr]">
        <section className="flex flex-col gap-3 rounded-3xl border border-line bg-panel-2/50 p-4">
          <Apparatus fraction={liveVolume / vMaxMl()} bubbling={running} />
          <p className="font-mono text-[0.9rem]">
            V(H₂) = <b>{formatDecimal(liveVolume, locale, 1)}</b> мл{running && ` · t = ${Math.round(simTime ?? 0)} с`}
          </p>
          <label className="flex flex-col gap-1 text-[0.85rem]">
            <span className="flex justify-between">
              {t("temperature")} <b className="font-mono">{T}</b>
            </span>
            <input type="range" min={TEMPERATURES[0]} max={TEMPERATURES.at(-1)} step={5} value={T} disabled={running} onChange={(e) => setT(Number(e.target.value))} className="accent-cyan" />
          </label>
          <label className="flex flex-col gap-1 text-[0.85rem]">
            <span className="flex justify-between">
              {t("concentration")} <b className="font-mono">{formatDecimal(c, locale, 2)}</b>
            </span>
            <input
              type="range"
              min={0}
              max={CONCENTRATIONS.length - 1}
              step={1}
              value={CONCENTRATIONS.indexOf(c as (typeof CONCENTRATIONS)[number])}
              disabled={running}
              onChange={(e) => setC(CONCENTRATIONS[Number(e.target.value)])}
              className="accent-cyan"
            />
          </label>
          {warn && !running && <p role="alert" className="rounded-xl border border-amber/50 bg-amber/10 px-3 py-2 text-[0.85rem] text-amber">⚠ {t("warnBoth")}</p>}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="glow" size="pill-sm" disabled={running || runs.length >= MAX_RUNS} onClick={start}>
              {running ? t("running") : `▶ ${t("start")}`}
            </Button>
            <Button type="button" variant="panel" size="pill-sm" disabled={running || !runs.length} onClick={() => onChange({ ...value, runs: [] })}>
              {t("clear")}
            </Button>
          </div>
          {runs.length >= MAX_RUNS && <p className="text-[0.8rem] text-muted-foreground">{t("maxRuns")}</p>}
        </section>

        <section className="flex min-w-0 flex-col gap-2 rounded-3xl border border-line bg-panel-2/50 p-4">
          <Graph runs={runs} gamma={gamma} running={running ? { run: current, t: simTime ?? 0, color } : null} />
          <p className="text-[0.78rem] text-muted-foreground">{t("reading")}</p>
          <p className="flex flex-wrap items-center gap-2 text-[0.78rem] text-muted-foreground">
            <ModelBadge /> {advanced ? t("gammaUnknown") : t("gammaNote")}
          </p>
          <h3 className="mt-1 font-display text-[0.95rem] font-semibold">{t("runs")}</h3>
          {runs.length < 2 && <p className="text-[0.82rem] text-muted-foreground">{t("needTwo")}</p>}
          <ol className="flex flex-col gap-1">
            {runs.map((run, i) => (
              <li key={i} className="flex items-center gap-2 font-mono text-[0.82rem]">
                <span aria-hidden="true" className={cn("h-1 w-5 rounded-full bg-current", RUN_COLORS[i])} />
                №{i + 1}: {run.T} °C, {formatDecimal(run.c, locale, 2)} М · t½ = {formatShort(Math.round(halfLife(run, gamma) * 10) / 10, locale)} с
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}

/** 5-қадам: № · T · c · t½ (модель) · V(30 с) — оқушы графиктен оқиды */
function Observation({ params, experiment, values, onChange }: ObservationProps) {
  const gamma = gammaOf(params);
  const t = useTranslations(LAB);
  const locale = useLocale() as Locale;
  return (
    <ObservationTable
      hint={t("observationHint")}
      columns={[
        { key: "n", label: t("observation.n"), kind: "auto" },
        { key: "T", label: t("observation.T"), kind: "auto" },
        { key: "c", label: t("observation.c"), kind: "auto" },
        { key: "half", label: t("observation.half"), kind: "auto", model: true },
        { key: "v30", label: t("observation.v30"), kind: "text", inputMode: "decimal", placeholder: "22,3" },
      ]}
      rows={runsOf(experiment).map((run, i) => ({
        id: `r${i}`,
        cells: {
          n: String(i + 1),
          T: String(run.T),
          c: formatDecimal(run.c, locale, 2),
          half: formatDecimal(halfLife(run, gamma), locale, 1),
        },
      }))}
      values={values}
      onChange={onChange}
    />
  );
}

function AnalysisData({ params }: { params: LabParams; experiment: LabValue }) {
  const t = useTranslations(`${LAB}.data`);
  const ta = useTranslations(`${LAB}.advanced`);
  const advanced = params.level === 10;
  return (
    <div className="flex flex-col gap-1.5 rounded-xl bg-panel-2 px-3.5 py-2.5 text-[0.88rem]">
      <span className="flex flex-wrap items-center gap-2">
        {t("vmax")} <ModelBadge />
      </span>
      <span className="font-mono text-[0.82rem] text-muted-foreground">{advanced ? ta("formula") : t("formula")}</span>
    </div>
  );
}

export const rateModule: LabModule = {
  useTexts,
  initialExperiment: { runs: [] },
  isExperimentDone: (value) => runsOf(value).length >= 2,
  Experiment,
  Observation,
  isObservationDone: (_params, experiment, values) => runsOf(experiment).every((_, i) => values[`r${i}.v30`]?.trim()),
  AnalysisData,
  formatReveal: (key, value, locale) => {
    const l = locale as Locale;
    if (key === "vMaxMl") return `${formatDecimal(value, l, 1)} мл`;
    if (key === "predictHalfLife") return `${formatDecimal(value, l, 1)} с`;
    if (key === "gamma") return formatShort(value, l);
    if (key === "violations") return String(value);
    return null;
  },
};
