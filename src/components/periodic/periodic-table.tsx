"use client";

import { useMemo, useRef, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import { inputClass } from "@/components/auth/form-parts";
import { elementProperties } from "@/lib/chemistry/element-properties";
import { ELEMENTS, getElement, searchElements, tablePosition, type ChemicalElement, type ElementCategory } from "@/lib/chemistry/elements";
import { formatPlain } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CATEGORY_STYLE, ElementDetails, toCelsius } from "./element-details";
import { FindElementPanel, useFindElementGame } from "./find-element-game";

const CATEGORIES = Object.keys(CATEGORY_STYLE) as ElementCategory[];

// «Кестені бояу» режимдері: әр элементтің сандық мәні (белгісіз — null)
const TRENDS = {
  electronegativity: (e: ChemicalElement) => e.electronegativity,
  mass: (e: ChemicalElement) => e.mass,
  radius: (e: ChemicalElement) => elementProperties(e.number).radius,
  ionization: (e: ChemicalElement) => elementProperties(e.number).ionization,
  melt: (e: ChemicalElement) => {
    const melt = elementProperties(e.number).melt;
    return melt === null ? null : toCelsius(melt);
  },
  density: (e: ChemicalElement) => elementProperties(e.number).density,
};
type Trend = keyof typeof TRENDS;
type Mode = "category" | Trend;
const TREND_KEYS = Object.keys(TRENDS) as Trend[];

// Бір реңкті шкала (cyan): ең кіші мән — 12%, ең үлкені — 100%. Қанық ұяшықта мәтін ақшыл/қара болып ауысады.
const MIN_MIX = 12;
const mix = (percent: number) => `color-mix(in oklch, var(--cyan) ${percent}%, var(--panel))`;

/** initialSymbol — элемент QR-ынан келгенде бірден таңдалатын элемент (мысалы "Na") */
export function PeriodicTable({ initialSymbol }: { initialSymbol?: string }) {
  const t = useTranslations("PeriodicTable");
  const locale = useLocale();
  const [selected, setSelected] = useState<ChemicalElement | null>(() =>
    initialSymbol ? (getElement(initialSymbol) ?? null) : null,
  );
  const [category, setCategory] = useState<ElementCategory | null>(null);
  const [mode, setMode] = useState<Mode>("category");
  const detailsRef = useRef<HTMLDivElement>(null);
  const game = useFindElementGame();

  const trend = useMemo(() => {
    if (mode === "category") return null;
    const values = ELEMENTS.map(TRENDS[mode]);
    const known = values.filter((v): v is number => v !== null);
    return { values, min: Math.min(...known), max: Math.max(...known) };
  }, [mode]);

  const format = (value: number) => formatPlain(Number(value.toPrecision(5)), locale);

  function select(element: ChemicalElement) {
    setSelected(element);
    // Ақпарат картасы экраннан тыс қалса — оған қарай жылжиды
    detailsRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }

  return (
    <div className="flex flex-col gap-5">
      <div ref={detailsRef} className="scroll-mt-20">
        <ElementDetails element={selected} />
      </div>

      <div className="flex flex-wrap items-start gap-3">
        {!game.game && <ElementSearch onSelect={select} />}
        <label className="flex min-w-0 flex-col gap-1 text-[0.8rem] font-semibold max-sm:w-full">
          {t("trend.label")}
          <select
            value={mode}
            onChange={(e) => {
              setMode(e.target.value as Mode);
              setCategory(null);
            }}
            className={cn(inputClass, "font-normal")}
          >
            <option value="category">{t("trend.category")}</option>
            {TREND_KEYS.map((key) => (
              <option key={key} value={key}>
                {t(`trend.${key}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <FindElementPanel game={game} />

      <p className="text-[0.8rem] text-muted-foreground md:hidden">↔ {t("scrollHint")}</p>
      {/* Кесте: телефонда көлденең жылжиды, бетті кеңейтпейді */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div
          className="grid min-w-[760px] gap-[3px]"
          style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))", gridTemplateRows: "repeat(7, auto) 12px auto auto" }}
        >
          {ELEMENTS.map((element, i) => {
            const { row, column } = tablePosition(element);
            const active = !game.game && selected?.number === element.number;
            const answer = game.cellState(element.number);
            const value = trend?.values[i] ?? null;
            const percent = trend && value !== null ? MIN_MIX + ((100 - MIN_MIX) * (value - trend.min)) / (trend.max - trend.min || 1) : null;
            // Ашық режимде қара мәтін барлық реңкте оқылады; қараңғы режимде қанық (ашық түсті) ұяшықта мәтін қараяды
            const strong = percent !== null && percent > 55;
            const style: CSSProperties = { gridRow: row, gridColumn: column };
            if (percent !== null) Object.assign(style, { background: mix(percent), borderColor: mix(Math.min(100, percent + 15)) });
            const name = element.name[locale];
            return (
              <button
                key={element.number}
                type="button"
                onClick={() => (game.game ? game.answer(element.number) : select(element))}
                aria-pressed={game.game ? undefined : active}
                // Ойын кезінде атауы жасырын — әйтпесе жауап көрініп қалады
                aria-label={game.game ? `${element.number} ${element.symbol}` : `${element.number} ${element.symbol} — ${name}`}
                title={game.game ? undefined : trend ? `${name}: ${value === null ? t("trend.noData") : format(value)}` : name}
                style={style}
                className={cn(
                  "relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-md border leading-none transition-transform hover:z-10 hover:scale-110",
                  mode === "category" && CATEGORY_STYLE[element.category],
                  trend && value === null && "border-dashed border-line bg-panel-2 text-muted-foreground",
                  strong && "dark:text-on-accent",
                  active && "z-10 scale-110 outline-2 outline-offset-1 outline-cyan",
                  category && element.category !== category && "opacity-20",
                  answer === "correct" && "z-10 scale-110 outline-3 outline-offset-1 outline-good",
                  answer === "wrong" && "z-10 outline-3 outline-offset-1 outline-pink",
                )}
              >
                <span className={cn("absolute top-0.5 left-1 font-mono text-[0.55rem]", strong ? "opacity-70" : "text-muted-foreground")}>
                  {element.number}
                </span>
                <span className="font-display text-[clamp(0.8rem,1.4vw,1.05rem)] font-bold">{element.symbol}</span>
              </button>
            );
          })}

          {/* Лантаноидтар мен актиноидтардың кестедегі орны */}
          <Placeholder row={6} label="57–71" category={mode === "category" ? "lanthanide" : null} dim={!!category && category !== "lanthanide"} />
          <Placeholder row={7} label="89–103" category={mode === "category" ? "actinide" : null} dim={!!category && category !== "actinide"} />
          <span style={{ gridRow: 9, gridColumn: "1 / span 2" }} className="self-center pr-1 text-right text-[0.7rem] text-muted-foreground">
            {t("lanthanides")}
          </span>
          <span style={{ gridRow: 10, gridColumn: "1 / span 2" }} className="self-center pr-1 text-right text-[0.7rem] text-muted-foreground">
            {t("actinides")}
          </span>
        </div>
      </div>

      {trend ? (
        /* Шкала: ең кіші → ең үлкен мән */
        <div>
          <h2 className="mb-2 text-[0.9rem] font-semibold">{t(`trend.${mode as Trend}`)}</h2>
          <div className="flex max-w-md items-center gap-2 font-mono text-[0.78rem] tabular-nums">
            <span>{format(trend.min)}</span>
            <span className="h-3 flex-1 rounded-full" style={{ background: `linear-gradient(to right, ${mix(MIN_MIX)}, ${mix(100)})` }} aria-hidden="true" />
            <span>{format(trend.max)}</span>
          </div>
          <p className="mt-2 flex items-center gap-2 text-[0.78rem] text-muted-foreground">
            <span className="inline-block size-3.5 rounded border border-dashed border-line bg-panel-2" aria-hidden="true" />
            {t("trend.noData")}
          </p>
          <p className="mt-2 max-w-[70ch] text-[0.85rem] text-muted-foreground">{t("trend.hint")}</p>
        </div>
      ) : (
        /* Түрлер (легенда) */
        <div>
          <h2 className="text-[0.9rem] font-semibold">{t("legend")}</h2>
          <p className="mb-2 text-[0.8rem] text-muted-foreground">{t("legendHint")}</p>
          <ul className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <button
                  type="button"
                  aria-pressed={category === c}
                  onClick={() => setCategory(category === c ? null : c)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-[0.78rem] transition-opacity",
                    CATEGORY_STYLE[c],
                    category === c && "outline-2 outline-offset-1 outline-cyan",
                    category && category !== c && "opacity-50",
                  )}
                >
                  {t(`categories.${c}`)}
                  {category === c && ` · ${ELEMENTS.filter((e) => e.category === c).length}`}
                </button>
              </li>
            ))}
          </ul>
          {category && (
            <p aria-live="polite" className={cn("mt-3 max-w-[75ch] rounded-xl border px-4 py-3 text-[0.88rem]", CATEGORY_STYLE[category])}>
              <b>{t(`categories.${category}`)}.</b> {t(`categoryInfo.${category}`)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Placeholder({ row, label, category, dim }: { row: number; label: string; category: ElementCategory | null; dim: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{ gridRow: row, gridColumn: 3 }}
      className={cn(
        "flex aspect-square items-center justify-center rounded-md border border-dashed font-mono text-[0.55rem] text-muted-foreground",
        category ? CATEGORY_STYLE[category] : "border-line",
        dim && "opacity-20",
      )}
    >
      {label}
    </span>
  );
}

/** Іздеу: атауы (үш тілде), белгісі немесе нөмірі бойынша; Enter — бірінші нәтиже */
function ElementSearch({ onSelect }: { onSelect: (element: ChemicalElement) => void }) {
  const t = useTranslations("PeriodicTable.search");
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const matches = searchElements(query);

  function pick(element: ChemicalElement) {
    onSelect(element);
    setQuery("");
  }

  return (
    <div className="min-w-0 flex-1 basis-64">
      <label htmlFor="element-search" className="mb-1 block text-[0.8rem] font-semibold">
        {t("label")}
      </label>
      <input
        id="element-search"
        type="search"
        autoComplete="off"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && matches[0]) pick(matches[0]);
        }}
        placeholder={t("placeholder")}
        className={inputClass}
      />
      {query.trim() && (
        <div className="mt-2 flex flex-wrap gap-1.5" aria-live="polite">
          {matches.length ? (
            matches.map((e) => (
              <button
                key={e.number}
                type="button"
                onClick={() => pick(e)}
                className={cn("min-h-9 rounded-full border px-3 py-1 text-[0.82rem] hover:outline-2 hover:outline-cyan-dim", CATEGORY_STYLE[e.category])}
              >
                <b className="font-mono">{e.symbol}</b> {e.name[locale]} <span className="font-mono text-muted-foreground">{e.number}</span>
              </button>
            ))
          ) : (
            <span className="text-[0.82rem] text-muted-foreground">{t("none")}</span>
          )}
        </div>
      )}
    </div>
  );
}
