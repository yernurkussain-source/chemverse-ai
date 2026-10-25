"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { electronConfiguration, electronShells } from "@/lib/chemistry/electron-config";
import { formatAtomicMass, formatElectronegativity } from "@/lib/chemistry/element-format";
import { ELEMENTS, getElement, tablePosition, type ChemicalElement, type ElementCategory } from "@/lib/chemistry/elements";
import { cn } from "@/lib/utils";

// Түрлердің түстері (ашық және қараңғы режимде де оқылатын жартылай мөлдір реңктер)
const CATEGORY_STYLE: Record<ElementCategory, string> = {
  alkali: "bg-[#ff6b6b]/15 border-[#ff6b6b]/45",
  "alkaline-earth": "bg-[#ffa94d]/18 border-[#ffa94d]/50",
  transition: "bg-[#4dabf7]/15 border-[#4dabf7]/45",
  "post-transition": "bg-[#20c997]/15 border-[#20c997]/45",
  metalloid: "bg-[#94d82d]/18 border-[#94d82d]/50",
  nonmetal: "bg-[#22b8cf]/18 border-[#22b8cf]/50",
  halogen: "bg-[#e599f7]/20 border-[#e599f7]/55",
  "noble-gas": "bg-[#9775fa]/18 border-[#9775fa]/50",
  lanthanide: "bg-[#f783ac]/15 border-[#f783ac]/45",
  actinide: "bg-[#fcc419]/18 border-[#fcc419]/50",
};

const CATEGORIES = Object.keys(CATEGORY_STYLE) as ElementCategory[];

// Three.js ауыр — тек «3D атом моделі» басылғанда жүктеледі
const AtomModel = dynamic(() => import("./atom-model").then((m) => m.AtomModel), { ssr: false });

/** initialSymbol — элемент QR-ынан келгенде бірден таңдалатын элемент (мысалы "Na") */
export function PeriodicTable({ initialSymbol }: { initialSymbol?: string }) {
  const t = useTranslations("PeriodicTable");
  const locale = useLocale();
  const [selected, setSelected] = useState<ChemicalElement | null>(() =>
    initialSymbol ? (getElement(initialSymbol) ?? null) : null,
  );
  const [category, setCategory] = useState<ElementCategory | null>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

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

      <p className="text-[0.8rem] text-muted-foreground md:hidden">↔ {t("scrollHint")}</p>
      {/* Кесте: телефонда көлденең жылжиды, бетті кеңейтпейді */}
      <div className="-mx-4 overflow-x-auto px-4 pb-2">
        <div
          className="grid min-w-[760px] gap-[3px]"
          style={{ gridTemplateColumns: "repeat(18, minmax(0, 1fr))", gridTemplateRows: "repeat(7, auto) 12px auto auto" }}
        >
          {ELEMENTS.map((element) => {
            const { row, column } = tablePosition(element);
            const active = selected?.number === element.number;
            return (
              <button
                key={element.number}
                type="button"
                onClick={() => select(element)}
                aria-pressed={active}
                aria-label={`${element.number} ${element.symbol} — ${element.name[locale]}`}
                title={element.name[locale]}
                style={{ gridRow: row, gridColumn: column }}
                className={cn(
                  "relative flex aspect-square min-w-0 flex-col items-center justify-center rounded-md border leading-none transition-transform hover:z-10 hover:scale-110",
                  CATEGORY_STYLE[element.category],
                  active && "z-10 scale-110 outline-2 outline-offset-1 outline-cyan",
                  category && element.category !== category && "opacity-20",
                )}
              >
                <span className="absolute top-0.5 left-1 font-mono text-[0.55rem] text-muted-foreground">{element.number}</span>
                <span className="font-display text-[clamp(0.8rem,1.4vw,1.05rem)] font-bold">{element.symbol}</span>
              </button>
            );
          })}

          {/* Лантаноидтар мен актиноидтардың кестедегі орны */}
          <Placeholder row={6} label="57–71" category="lanthanide" dim={!!category && category !== "lanthanide"} />
          <Placeholder row={7} label="89–103" category="actinide" dim={!!category && category !== "actinide"} />
          <span style={{ gridRow: 9, gridColumn: "1 / span 2" }} className="self-center pr-1 text-right text-[0.7rem] text-muted-foreground">
            {t("lanthanides")}
          </span>
          <span style={{ gridRow: 10, gridColumn: "1 / span 2" }} className="self-center pr-1 text-right text-[0.7rem] text-muted-foreground">
            {t("actinides")}
          </span>
        </div>
      </div>

      {/* Түрлер (легенда) */}
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
      </div>
    </div>
  );
}

function Placeholder({ row, label, category, dim }: { row: number; label: string; category: ElementCategory; dim: boolean }) {
  return (
    <span
      aria-hidden="true"
      style={{ gridRow: row, gridColumn: 3 }}
      className={cn(
        "flex aspect-square items-center justify-center rounded-md border border-dashed font-mono text-[0.55rem] text-muted-foreground",
        CATEGORY_STYLE[category],
        dim && "opacity-20",
      )}
    >
      {label}
    </span>
  );
}

/** Таңдалған элементтің ақпараты */
function ElementDetails({ element }: { element: ChemicalElement | null }) {
  const t = useTranslations("PeriodicTable");
  const locale = useLocale();
  const [showAtom, setShowAtom] = useState(false);

  if (!element) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-6 text-center text-muted-foreground">
        {t("selectHint")}
      </div>
    );
  }

  const electronegativity = formatElectronegativity(element, locale);
  return (
    <>
      <div aria-live="polite" className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-4 shadow-[0_1px_2px_var(--shadow)] sm:flex-row sm:items-center dark:shadow-none">
        <div className={cn("flex size-24 shrink-0 flex-col items-center justify-center rounded-2xl border", CATEGORY_STYLE[element.category])}>
          <span className="font-mono text-xs text-muted-foreground">{element.number}</span>
          <span className="font-display text-4xl font-bold">{element.symbol}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-bold">{element.name[locale]}</p>
          <p className="text-[0.85rem] text-muted-foreground">{t(`categories.${element.category}`)}</p>
          <dl className="m-0 mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Fact label={t("atomicNumber")} value={String(element.number)} />
            <Fact label={t("atomicMass")} value={formatAtomicMass(element, locale)} />
            <Fact label={t("electronegativity")} value={electronegativity ?? t("unknown")} />
            <Fact
              label={`${t("period")} / ${t("group")}`}
              value={`${element.period} / ${element.group ?? "—"}`}
            />
            <Fact label={t("protons")} value={String(element.number)} />
            <Fact label={t("neutrons")} value={String(Math.round(element.mass) - element.number)} />
            <Fact label={t("electrons")} value={String(element.number)} />
            <Fact label={t("shells")} value={electronShells(element.number).join(", ")} />
          </dl>
          <p className="mt-2 text-[0.85rem]">
            <span className="text-muted-foreground">{t("electronConfig")}: </span>
            <ElectronConfiguration z={element.number} />
          </p>
          {!element.stable && <p className="mt-2 text-[0.75rem] text-muted-foreground">[ ] — {t("radioactive")}</p>}
          <Button variant="glow" size="pill-sm" className="mt-3" onClick={() => setShowAtom(true)}>
            ⚛ {t("atomModel")}
          </Button>
        </div>
      </div>
      {showAtom && <AtomModel element={element} onClose={() => setShowAtom(false)} />}
    </>
  );
}

function ElectronConfiguration({ z }: { z: number }) {
  const { core, parts } = electronConfiguration(z);
  return (
    <span className="font-mono">
      {core && `[${core}] `}
      {parts.map(([name, count]) => (
        <span key={name} className="mr-1">
          {name}
          <sup>{count}</sup>
        </span>
      ))}
    </span>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-panel-2 px-3 py-2">
      <dt className="truncate font-mono text-[0.68rem] text-muted-foreground">{label}</dt>
      <dd className="m-0 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
