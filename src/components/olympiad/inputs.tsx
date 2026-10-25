"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { CAPS, ORDER, splitEq } from "@/features/olympiad/core";
import { prettyFormula, type PublicProblem } from "@/features/olympiad/practice";
import { cn } from "@/lib/utils";

export type EconfAnswer = { occ: Record<string, number>; unpaired: number };
export type Answer = string | number | null | number[] | EconfAnswer;

export function initialAnswer(p: PublicProblem): Answer {
  if (p.type === "mcq") return null;
  if (p.type === "balance") {
    const { L, R } = splitEq(p.equation!);
    return [...L, ...R].map(() => 1);
  }
  if (p.type === "econf") return { occ: {}, unpaired: 0 };
  return "";
}

/** Жауап толық енгізілді ме (тексеру батырмасы сонда ғана белсенді) */
export function isReady(p: PublicProblem, a: Answer) {
  if (p.type === "numeric" || p.type === "open") return typeof a === "string" && a.trim() !== "";
  if (p.type === "mcq") return a !== null;
  if (p.type === "econf") return Object.values((a as EconfAnswer).occ).some((n) => n > 0);
  return true;
}

/** Есеп түріне қарай енгізу өрісі (жаттығу мен сынақта ортақ) */
export function AnswerInput({ problem, answer, disabled, onChange }: { problem: PublicProblem; answer: Answer; disabled?: boolean; onChange: (answer: Answer) => void }) {
  const t = useTranslations("Olympiad.problem");
  switch (problem.type) {
    case "numeric":
      return <NumericInput value={answer as string} unit={problem.unit} disabled={disabled} onChange={onChange} />;
    case "mcq":
      return <McqInput choices={problem.choices ?? []} value={answer as number | null} disabled={disabled} onChange={onChange} />;
    case "balance":
      return <BalanceInput equation={problem.equation ?? ""} value={answer as number[]} disabled={disabled} onChange={onChange} />;
    case "econf":
      return <EconfInput value={answer as EconfAnswer} disabled={disabled} onChange={onChange} />;
    default:
      return (
        <label className="flex flex-col gap-1.5">
          <span className="text-[0.85rem] font-semibold text-muted-foreground">{t("openAnswer")}</span>
          <textarea
            value={answer as string}
            disabled={disabled}
            maxLength={4000}
            rows={7}
            onChange={(e) => onChange(e.target.value)}
            className="min-h-40 rounded-2xl border border-line bg-panel-2 px-4 py-3 text-foreground"
          />
          <span className="text-[0.8rem] text-muted-foreground">{t("openNote")}</span>
        </label>
      );
  }
}

const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
const sup = (n: number) => String(n).replace(/\d/g, (d) => SUP[+d]);

const STEP_BUTTON =
  "grid size-11 shrink-0 place-items-center rounded-xl border border-line bg-panel font-mono text-xl font-semibold transition-colors hover:border-cyan-dim disabled:opacity-35";

/** − сан + : телефонда саусақпен басуға ыңғайлы (44 px батырмалар) */
function Stepper({ label, value, min, max, disabled, onChange }: { label: string; value: number; min: number; max: number; disabled?: boolean; onChange: (value: number) => void }) {
  const t = useTranslations("Olympiad.problem");
  return (
    <span className="flex items-center gap-1">
      <button type="button" aria-label={t("decrease", { name: label })} disabled={disabled || value <= min} onClick={() => onChange(value - 1)} className={STEP_BUTTON}>
        −
      </button>
      <output aria-label={label} className="w-8 text-center font-mono text-lg font-semibold tabular-nums">
        {value}
      </output>
      <button type="button" aria-label={t("increase", { name: label })} disabled={disabled || value >= max} onClick={() => onChange(value + 1)} className={STEP_BUTTON}>
        +
      </button>
    </span>
  );
}

/** Сан + бірлік: үтір де, нүкте де қабылданады (тексеру серверде) */
export function NumericInput({ value, unit, disabled, onChange }: { value: string; unit?: string; disabled?: boolean; onChange: (value: string) => void }) {
  const t = useTranslations("Olympiad.problem");
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.85rem] font-semibold text-muted-foreground">{t("answer")}</span>
      <span className="flex items-center gap-3">
        <input
          inputMode="decimal"
          autoComplete="off"
          maxLength={40}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t("numericPlaceholder")}
          className="h-12 w-full max-w-60 min-w-0 rounded-2xl border border-line bg-panel-2 px-4 font-mono text-lg text-foreground placeholder:text-muted-foreground/60"
        />
        {unit && (
          <span className="font-mono text-[1rem] font-semibold text-muted-foreground" title={t("unit", { unit })}>
            {unit}
          </span>
        )}
      </span>
    </label>
  );
}

const LETTERS = "АБВГДЕ";

/** Бір дұрыс жауапты таңдау */
export function McqInput({ choices, value, disabled, onChange }: { choices: string[]; value: number | null; disabled?: boolean; onChange: (value: number) => void }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {choices.map((choice, i) => {
        const selected = value === i;
        return (
          <li key={i}>
            <button
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onChange(i)}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors disabled:cursor-default",
                selected ? "border-cyan bg-cyan/10" : "border-line bg-panel-2 enabled:hover:border-cyan-dim",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border font-mono text-[0.9rem] font-semibold",
                  selected ? "border-cyan bg-cyan text-on-accent" : "border-line",
                )}
              >
                {LETTERS[i]}
              </span>
              <span>{choice}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Теңдеуді теңестіру: әр затқа коэффициент (+ / −) */
export function BalanceInput({ equation, value, disabled, onChange }: { equation: string; value: number[]; disabled?: boolean; onChange: (value: number[]) => void }) {
  const t = useTranslations("Olympiad.problem");
  const { L, R } = splitEq(equation);
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2.5">
      {[...L, ...R].map((species, i) => {
        const formula = prettyFormula(species);
        return (
          <Fragment key={i}>
            {i > 0 && (
              <span aria-hidden="true" className={cn("font-mono text-xl font-semibold", i === L.length ? "text-cyan" : "text-muted-foreground")}>
                {i === L.length ? "→" : "+"}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-2xl border border-line bg-panel-2 p-1.5 pr-3">
              <Stepper
                label={t("coefficient", { formula })}
                value={value[i]}
                min={1}
                max={40}
                disabled={disabled}
                onChange={(k) => onChange(value.map((x, j) => (j === i ? k : x)))}
              />
              <span className="font-mono text-[1.05rem] font-semibold">{formula}</span>
            </span>
          </Fragment>
        );
      })}
    </div>
  );
}

/** Электрондық конфигурация: деңгейшелерді Клечковский ретімен толтыру + жұпталмаған электрондар */
export function EconfInput({ value, disabled, onChange }: { value: EconfAnswer; disabled?: boolean; onChange: (value: EconfAnswer) => void }) {
  const t = useTranslations("Olympiad.problem");
  const filled = ORDER.filter((o) => value.occ[o] > 0);
  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-2 text-[0.85rem] font-semibold text-muted-foreground">{t("sublevels")}</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {ORDER.map((o) => (
            <div key={o} className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-panel-2 p-1.5">
              <span className="font-mono text-[1.05rem] font-semibold">{o}</span>
              <Stepper
                label={o}
                value={value.occ[o] ?? 0}
                min={0}
                max={CAPS[o[1]]}
                disabled={disabled}
                onChange={(e) => onChange({ ...value, occ: { ...value.occ, [o]: e } })}
              />
            </div>
          ))}
        </div>
      </fieldset>
      <p className="min-h-7 rounded-xl bg-panel-2 px-3 py-1.5 font-mono text-[1rem]" aria-live="polite">
        <span className="font-sans text-[0.8rem] text-muted-foreground">{t("preview")}: </span>
        {filled.map((o) => o + sup(value.occ[o])).join(" ") || "—"}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-line bg-panel-2 p-1.5 pl-3.5">
        <span className="text-[0.9rem] font-semibold">{t("unpaired")}</span>
        <Stepper label={t("unpaired")} value={value.unpaired} min={0} max={10} disabled={disabled} onChange={(unpaired) => onChange({ ...value, unpaired })} />
      </div>
    </div>
  );
}
