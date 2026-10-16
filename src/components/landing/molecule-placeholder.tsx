"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { molarMass, MOLECULES, type MoleculeId } from "@/lib/chemistry/molecules";
import { formatDecimal } from "@/lib/format";

/**
 * 3D молекула көрінісінің орны.
 * 3-күні мұнда 3Dmol.js / Three.js көрінісі қосылады; молекула таңдау және деректер қазір де жұмыс істейді.
 */
export function MoleculePlaceholder() {
  const t = useTranslations("Viewer");
  const tm = useTranslations("Molecules");
  const [selected, setSelected] = useState<MoleculeId>("h2o");
  const molecule = MOLECULES.find((m) => m.id === selected) ?? MOLECULES[0];

  return (
    <figure
      aria-label={t("label")}
      className="relative m-0 w-full max-w-xl min-w-0 justify-self-center overflow-hidden rounded-3xl border lg:max-w-none border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)] shadow-[0_1px_2px_var(--shadow)] dark:shadow-none"
    >
      <div className="relative aspect-square w-full">
        {/* Формула және атауы */}
        <div className="absolute top-3.5 left-3.5 font-mono text-2xl font-semibold" aria-live="polite">
          {molecule.formula}
          <small className="block font-sans text-[0.8rem] font-medium text-muted-foreground">
            {tm(`${molecule.id}.name`)}
          </small>
        </div>

        {/* Уақытша орын: айналатын атом белгісі */}
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 pt-12 pb-20 text-center">
          <svg viewBox="0 0 120 120" className="w-[32%] max-w-44 animate-orbit" aria-hidden="true">
            <circle className="text-cyan" cx="60" cy="60" r="12" fill="currentColor" />
            <ellipse className="text-cyan" cx="60" cy="60" rx="52" ry="20" fill="none" stroke="currentColor" strokeWidth="2" opacity=".7" />
            <ellipse className="text-pink" cx="60" cy="60" rx="52" ry="20" fill="none" stroke="currentColor" strokeWidth="2" opacity=".8" transform="rotate(60 60 60)" />
            <ellipse className="text-cyan" cx="60" cy="60" rx="52" ry="20" fill="none" stroke="currentColor" strokeWidth="2" opacity=".5" transform="rotate(120 60 60)" />
          </svg>
          <div>
            <p className="font-display text-sm font-semibold">{t("placeholderTitle")}</p>
            <p className="mt-1 max-w-[30ch] text-xs text-muted-foreground">{t("placeholderNote")}</p>
          </div>
        </div>

        {/* Молекула таңдау */}
        <div
          role="group"
          aria-label={t("pickLabel")}
          className="absolute inset-x-3.5 bottom-3.5 flex flex-wrap gap-1.5"
        >
          {MOLECULES.map((m) => {
            const active = m.id === selected;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                title={tm(`${m.id}.name`)}
                onClick={() => setSelected(m.id)}
                className={cn(
                  "min-h-9 rounded-[9px] border bg-overlay px-2.5 py-1.5 font-mono text-[0.82rem] transition-colors",
                  active
                    ? "border-cyan text-cyan shadow-[inset_0_0_14px_var(--glow-soft)]"
                    : "border-line hover:border-cyan-dim",
                )}
              >
                {m.formula}
              </button>
            );
          })}
        </div>
      </div>

      {/* Молекула деректері */}
      <dl className="m-0 grid grid-cols-3 gap-px border-t border-line bg-line">
        <Fact label={t("facts.mass")} value={`${formatDecimal(molarMass(molecule.atoms))} ${t("massUnit")}`} />
        <Fact label={t("facts.shape")} value={tm(`${molecule.id}.shape`)} />
        <Fact label={t("facts.angle")} value={molecule.angle} />
      </dl>
    </figure>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 bg-panel px-3.5 py-3">
      <dt className="font-mono text-[0.72rem] tracking-[0.06em] text-muted-foreground uppercase">{label}</dt>
      <dd className="m-0 mt-0.5 font-bold tabular-nums">{value}</dd>
    </div>
  );
}
