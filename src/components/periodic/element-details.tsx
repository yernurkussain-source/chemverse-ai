"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { electronConfiguration, electronShells, hundBoxes } from "@/lib/chemistry/electron-config";
import { formatAtomicMass, formatElectronegativity } from "@/lib/chemistry/element-format";
import { elementProperties } from "@/lib/chemistry/element-properties";
import { elementUses } from "@/lib/chemistry/element-uses";
import type { ChemicalElement, ElementCategory } from "@/lib/chemistry/elements";
import { moleculesWith } from "@/lib/chemistry/molecules";
import { formatPlain, formatShort } from "@/lib/format";
import { cn } from "@/lib/utils";

// Түрлердің түстері (ашық және қараңғы режимде де оқылатын жартылай мөлдір реңктер)
export const CATEGORY_STYLE: Record<ElementCategory, string> = {
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

/** Кельвин → °C (бір ондық таңбамен) */
export const toCelsius = (kelvin: number) => Math.round((kelvin - 273.15) * 10) / 10;

// Three.js ауыр — тек «3D атом моделі» басылғанда жүктеледі
const AtomModel = dynamic(() => import("./atom-model").then((m) => m.AtomModel), { ssr: false });

const TABS = ["basic", "structure", "properties"] as const;
type Tab = (typeof TABS)[number];

/** Таңдалған элементтің ақпараты: үш қойынды + 3D модель + AI мұғалім */
export function ElementDetails({ element }: { element: ChemicalElement | null }) {
  const t = useTranslations("PeriodicTable");
  const locale = useLocale();
  const [showAtom, setShowAtom] = useState(false);
  const [tab, setTab] = useState<Tab>("basic");

  if (!element) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-panel px-4 py-6 text-center text-muted-foreground">
        {t("selectHint")}
      </div>
    );
  }

  const z = element.number;
  const props = elementProperties(z);
  const unknown = t("unknown");
  const temperature = (kelvin: number | null) => (kelvin === null ? unknown : `${formatShort(toCelsius(kelvin), locale)} °C`);
  // Газдың тығыздығы г/л-мен (г/см³-те тым кіші сан шығады)
  const density =
    props.density === null
      ? unknown
      : props.state === "gas"
        ? `${formatPlain(Number((props.density * 1000).toPrecision(4)), locale)} ${t("units.gl")}`
        : `${formatPlain(props.density, locale)} ${t("units.gcm3")}`;

  return (
    <>
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-panel p-4 shadow-[0_1px_2px_var(--shadow)] sm:flex-row dark:shadow-none">
        <div className={cn("flex size-24 shrink-0 flex-col items-center justify-center rounded-2xl border", CATEGORY_STYLE[element.category])}>
          <span className="font-mono text-xs text-muted-foreground">{z}</span>
          <span className="font-display text-4xl font-bold">{element.symbol}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div aria-live="polite">
            <p className="font-display text-xl font-bold">{element.name[locale]}</p>
            <p className="text-[0.85rem] text-muted-foreground">{t(`categories.${element.category}`)}</p>
          </div>

          <div role="tablist" aria-label={t("tabsLabel")} className="mt-3 flex w-fit max-w-full overflow-x-auto rounded-full border border-line bg-panel-2 p-1">
            {TABS.map((value) => (
              <button
                key={value}
                id={`element-tab-${value}`}
                type="button"
                role="tab"
                aria-selected={tab === value}
                aria-controls="element-tabpanel"
                onClick={() => setTab(value)}
                className={cn(
                  "min-h-9 shrink-0 rounded-full px-3.5 text-[0.82rem] font-semibold transition-colors",
                  tab === value ? "bg-cyan text-on-accent" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t(`tabs.${value}`)}
              </button>
            ))}
          </div>

          <div id="element-tabpanel" role="tabpanel" aria-labelledby={`element-tab-${tab}`} className="mt-3">
            {tab === "basic" && (
              <>
                <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  <Fact label={t("atomicNumber")} value={String(z)} />
                  <Fact label={t("atomicMass")} value={formatAtomicMass(element, locale)} />
                  <Fact label={t("electronegativity")} value={formatElectronegativity(element, locale) ?? unknown} />
                  <Fact label={`${t("period")} / ${t("group")}`} value={`${element.period} / ${element.group ?? "—"}`} />
                  <Fact
                    label={t("state")}
                    value={`${t(`states.${props.state}`)}${props.predicted ? ` (${t("predicted")})` : ""}`}
                  />
                  <Fact label={t("discovered")} value={props.year === 0 ? t("ancient") : String(props.year)} />
                </dl>
                <p className="mt-3 text-[0.9rem]">
                  <span className="font-semibold">{t("uses")}: </span>
                  {elementUses(z, locale)}
                </p>
                {!element.stable && <p className="mt-2 text-[0.75rem] text-muted-foreground">[ ] — {t("radioactive")}</p>}
                <ElementMolecules symbol={element.symbol} />
              </>
            )}

            {tab === "structure" && (
              <>
                <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Fact label={t("protons")} value={String(z)} />
                  <Fact label={t("neutrons")} value={String(Math.round(element.mass) - z)} />
                  <Fact label={t("electrons")} value={String(z)} />
                  <Fact label={t("shells")} value={electronShells(z).join(", ")} />
                </dl>
                <p className="mt-3 text-[0.85rem]">
                  <span className="text-muted-foreground">{t("electronConfig")}: </span>
                  <ElectronConfiguration z={z} />
                </p>
                <p className="mt-3 mb-1.5 text-[0.8rem] text-muted-foreground">{t("orbitals")}</p>
                <OrbitalDiagram z={z} />
              </>
            )}

            {tab === "properties" && (
              <>
                <dl className="m-0 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Fact label={t("melt")} value={temperature(props.melt)} />
                  <Fact label={t("boil")} value={temperature(props.boil)} />
                  <Fact label={t("density")} value={density} />
                  <Fact label={t("oxidation")} value={props.oxidation ? props.oxidation.replaceAll("-", "−") : unknown} />
                  <Fact label={t("radius")} value={props.radius === null ? unknown : `${props.radius} ${t("units.pm")}`} />
                  <Fact
                    label={t("ionization")}
                    value={props.ionization === null ? unknown : `${formatPlain(props.ionization, locale)} ${t("units.ev")}`}
                  />
                </dl>
                <p className="mt-2 text-[0.75rem] text-muted-foreground">{t("dataSource")}</p>
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button variant="glow" size="pill-sm" onClick={() => setShowAtom(true)}>
              ⚛ {t("atomModel")}
            </Button>
            <Link
              href={{ pathname: "/ai-tutor", query: { q: t("askAiQuestion", { name: element.name[locale], symbol: element.symbol }) } }}
              className="rounded-full border border-cyan-dim px-3.5 py-2 text-[0.82rem] font-semibold text-cyan hover:bg-cyan/10"
            >
              ✦ {t("askAi")}
            </Link>
          </div>
        </div>
      </div>
      {showAtom && <AtomModel element={element} onClose={() => setShowAtom(false)} />}
    </>
  );
}

/** Осы элемент кіретін 3D молекулалар (сілтемелер) */
function ElementMolecules({ symbol }: { symbol: string }) {
  const t = useTranslations("PeriodicTable");
  const tm = useTranslations("Molecules");
  const molecules = moleculesWith(symbol);
  if (!molecules.length) return null;
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[0.8rem] text-muted-foreground">{t("molecules")}</p>
      <ul className="flex flex-wrap gap-1.5">
        {molecules.map((m) => (
          <li key={m.id}>
            <Link
              href={`/molecules/${m.id}`}
              title={tm(`${m.id}.name`)}
              className="inline-flex min-h-8 items-center rounded-full border border-line bg-panel-2 px-3 font-mono text-[0.8rem] hover:border-cyan-dim"
            >
              {m.formula}
            </Link>
          </li>
        ))}
      </ul>
    </div>
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

/** Орбиталь диаграммасы: асыл газ ядросынан кейінгі деңгейшелер, әр ұяшық — бір орбиталь */
function OrbitalDiagram({ z }: { z: number }) {
  const { core, parts } = electronConfiguration(z);
  return (
    <div className="flex flex-wrap items-end gap-x-3 gap-y-2">
      {core && <span className="pb-6 font-mono text-[0.85rem]">[{core}]</span>}
      {parts.map(([name, count]) => (
        <div key={name} className="flex flex-col items-center gap-1">
          <div className="flex" aria-hidden="true">
            {hundBoxes(name, count).map((arrows, i) => (
              <span
                key={i}
                className="-ml-px flex h-9 w-8 items-center justify-center border border-cyan-dim font-mono text-base font-bold text-cyan first:ml-0"
              >
                {arrows}
              </span>
            ))}
          </div>
          <span className="font-mono text-[0.72rem]">
            {name}
            <sup>{count}</sup>
          </span>
        </div>
      ))}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-panel-2 px-3 py-2">
      <dt className="truncate font-mono text-[0.68rem] text-muted-foreground" title={label}>
        {label}
      </dt>
      <dd className="m-0 font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
