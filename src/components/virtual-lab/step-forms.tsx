"use client";

import { useTranslations } from "next-intl";
import { CONCLUSION_MAX_LENGTH, countSentences } from "@/features/virtual-lab/conclusion";
import { cn } from "@/lib/utils";
import { ChoiceList, ModelBadge } from "./parts";

/** 3-қадам: құралдарды таңдау (дұрыс-бұрысы тек бағалауда ашылады) */
export function EquipmentPicker({
  items,
  selected,
  onToggle,
}: {
  items: { id: string; label: string }[];
  selected: string[];
  onToggle: (id: string) => void;
}) {
  const t = useTranslations("ChemLab.equipmentStep");
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">{t("hint")}</p>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((item) => {
          const on = selected.includes(item.id);
          return (
            <li key={item.id}>
              <button
                type="button"
                aria-pressed={on}
                onClick={() => onToggle(item.id)}
                className={cn(
                  "flex min-h-14 w-full items-center gap-2.5 rounded-2xl border px-3.5 py-2.5 text-left text-[0.92rem] transition-colors",
                  on ? "border-cyan bg-cyan/10 font-semibold" : "border-line bg-panel-2 hover:border-cyan-dim",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-md border-2 text-[0.7rem] font-bold",
                    on ? "border-cyan bg-cyan text-on-accent" : "border-line",
                  )}
                >
                  {on && "✓"}
                </span>
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="font-mono text-[0.8rem] text-muted-foreground">{t("selected", { count: selected.length })}</p>
    </div>
  );
}

export type ObservationColumn =
  | { key: string; label: string; kind: "auto"; model?: boolean }
  | { key: string; label: string; kind: "select"; options: { value: string; label: string }[] };

/**
 * 5-қадам: бақылау кестесі. «auto» бағандар модельден толады (ModelBadge), «select» бағандарды оқушы толтырады.
 * Ұяшық id-і: `${row.id}.${column.key}` (мысалы r0.color) — сервер дәл осы кілттерді тексереді.
 */
export function ObservationTable({
  columns,
  rows,
  values,
  onChange,
}: {
  columns: ObservationColumn[];
  rows: { id: string; cells: Record<string, string> }[];
  values: Record<string, string>;
  onChange: (cellId: string, value: string) => void;
}) {
  const t = useTranslations("ChemLab.observationStep");
  const autoColumns = columns.filter((c) => c.kind === "auto");
  const selectColumns = columns.filter((c) => c.kind === "select");

  const select = (column: Extract<ObservationColumn, { kind: "select" }>, row: { id: string; cells: Record<string, string> }, className?: string) => {
    const cellId = `${row.id}.${column.key}`;
    return (
      <select
        aria-label={`${column.label} · ${row.cells[columns[0].key]}`}
        value={values[cellId] ?? ""}
        onChange={(e) => onChange(cellId, e.target.value)}
        className={cn(
          "w-full min-w-24 rounded-lg border bg-panel px-2 py-1.5",
          values[cellId] ? "border-cyan-dim" : "border-line text-muted-foreground",
          className,
        )}
      >
        <option value="" disabled>
          {t("choose")}
        </option>
        {column.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">{t("hint")}</p>

      {/* Телефон: әр жол — жеке карточка (кесте экранға сыймайды) */}
      <ol className="flex flex-col gap-2 sm:hidden">
        {autoColumns.some((c) => c.kind === "auto" && c.model) && <ModelBadge className="self-start" />}
        {rows.map((row) => (
          <li key={row.id} className="rounded-2xl bg-panel-2 p-3">
            <p className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.85rem]">
              {autoColumns.map((column) => (
                <span key={column.key}>
                  <span className="text-muted-foreground">{column.label}: </span>
                  <b className="font-mono tabular-nums">{row.cells[column.key]}</b>
                </span>
              ))}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {selectColumns.map((column) => (
                <label key={column.key} className="flex flex-col gap-1 text-[0.75rem] text-muted-foreground">
                  {column.label}
                  {column.kind === "select" && select(column, row, "py-2.5 text-[0.95rem] text-foreground")}
                </label>
              ))}
            </div>
          </li>
        ))}
      </ol>

      <div className="hidden sm:block">
        <table className="w-full border-separate border-spacing-y-1.5 text-[0.9rem]">
          <thead>
            <tr className="text-left text-[0.78rem] text-muted-foreground">
              {columns.map((column) => (
                <th key={column.key} scope="col" className="px-2 py-1 font-semibold">
                  <span className="flex flex-wrap items-center gap-1.5">
                    {column.label}
                    {column.kind === "auto" && column.model && <ModelBadge />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="bg-panel-2">
                {columns.map((column, i) => {
                  return (
                    <td
                      key={column.key}
                      className={cn("px-2 py-1.5", i === 0 && "rounded-l-xl", i === columns.length - 1 && "rounded-r-xl")}
                    >
                      {column.kind === "auto" ? (
                        <span className="font-mono font-semibold tabular-nums">{row.cells[column.key]}</span>
                      ) : (
                        select(column, row)
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export type AnalysisQuestion =
  | { id: string; kind: "number"; label: string; unit?: string }
  | { id: string; kind: "choice"; label: string; options: { value: string; label: string }[] };

/** 6-қадам: талдау сұрақтары (сандық жауап + таңдау). Тексеруді тек сервер жасайды */
export function AnalysisQuestions({
  questions,
  answers,
  onChange,
}: {
  questions: AnalysisQuestion[];
  answers: Record<string, string>;
  onChange: (id: string, value: string) => void;
}) {
  const t = useTranslations("ChemLab.analysisStep");
  return (
    <ol className="flex list-decimal flex-col gap-5 pl-5">
      {questions.map((q) => (
        <li key={q.id} className="pl-1">
          {q.kind === "number" ? (
            <label className="flex flex-col gap-2">
              <span className="font-semibold">{q.label}</span>
              <span className="flex items-center gap-2">
                <input
                  value={answers[q.id] ?? ""}
                  onChange={(e) => onChange(q.id, e.target.value.slice(0, 20))}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder={t("placeholder")}
                  className="w-full max-w-48 rounded-[10px] border border-line bg-panel-2 px-3 py-2.5 font-mono text-lg"
                />
                {q.unit && <span className="font-mono text-muted-foreground">{q.unit}</span>}
              </span>
            </label>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="font-semibold">{q.label}</span>
              <ChoiceList name={q.id} label={q.label} options={q.options} value={answers[q.id]} onChange={(v) => onChange(q.id, v)} />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** 7-қадам: қорытынды. Құрылым ұсынылады (Мақсат → Нәтиже → Түсіндіру), дайын мәтін берілмейді */
export function ConclusionEditor({ value, onChange, hint }: { value: string; onChange: (value: string) => void; hint: string }) {
  const t = useTranslations("ChemLab.conclusionStep");
  const sentences = countSentences(value);
  return (
    <div className="flex flex-col gap-3">
      <p className="text-muted-foreground">{t("hint")}</p>
      <ol className="grid gap-2 sm:grid-cols-3">
        {(["goal", "result", "explain"] as const).map((part, i) => (
          <li key={part} className="rounded-2xl border border-line bg-panel-2 px-3.5 py-2.5 text-[0.88rem]">
            <span className="mr-1.5 font-mono font-semibold text-cyan">{i + 1}.</span>
            {t(`structure.${part}`)}
          </li>
        ))}
      </ol>
      <p className="text-[0.88rem] text-muted-foreground">{hint}</p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, CONCLUSION_MAX_LENGTH))}
        rows={6}
        aria-label={t("hint")}
        placeholder={t("placeholder")}
        className="w-full resize-y rounded-2xl border border-line bg-panel-2 px-4 py-3 leading-relaxed text-foreground placeholder:text-muted-foreground/70"
      />
      <p className={cn("font-mono text-[0.8rem]", sentences >= 2 ? "text-good" : "text-muted-foreground")}>
        {t("sentences", { count: sentences })} · {value.length}/{CONCLUSION_MAX_LENGTH}
        {sentences < 2 && ` · ${t("minHint")}`}
      </p>
    </div>
  );
}
