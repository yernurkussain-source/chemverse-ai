"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MoleculeViewer, VIEW_STYLES, type ViewStyle } from "@/components/molecules/molecule-viewer";
import { FEATURED_MOLECULES, molarMass, type MoleculeId } from "@/lib/chemistry/molecules";
import { formatDecimal, formatShort } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Басты беттегі 3D молекула (прототиптегі «viewer» блогы) */
export function MoleculeShowcase() {
  const t = useTranslations("Viewer");
  const tm = useTranslations("Molecules");
  const locale = useLocale();
  const [selected, setSelected] = useState<MoleculeId>("h2o");
  const [viewStyle, setViewStyle] = useState<ViewStyle>("ballStick");
  const molecule = FEATURED_MOLECULES.find((m) => m.id === selected) ?? FEATURED_MOLECULES[0];

  // Сандар тілге сай: kk/ru — 18,02; en — 18.02
  const mass = formatDecimal(molarMass(molecule.atoms), locale);
  const angle = `${molecule.angle.approx ? "≈" : ""}${formatShort(molecule.angle.degrees, locale)}°`;
  const cycleStyle = () => setViewStyle((s) => VIEW_STYLES[(VIEW_STYLES.indexOf(s) + 1) % VIEW_STYLES.length]);

  return (
    <figure
      aria-label={t("label")}
      className="relative m-0 w-full max-w-xl min-w-0 justify-self-center overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)] shadow-[0_1px_2px_var(--shadow)] lg:max-w-none dark:shadow-none"
    >
      <MoleculeViewer
        molecule={molecule}
        viewStyle={viewStyle}
        onCycleStyle={cycleStyle}
        className="aspect-square w-full"
        atomCardClassName="top-15 right-3"
      >
        {/* Формула және атауы */}
        <div className="pointer-events-none absolute top-3.5 left-3.5 font-mono text-2xl font-semibold" aria-live="polite">
          {molecule.formula}
          <small className="block font-sans text-[0.8rem] font-medium text-muted-foreground">
            {tm(`${molecule.id}.name`)}
          </small>
        </div>

        {/* Молекула таңдау */}
        <div role="group" aria-label={t("pickLabel")} className="absolute inset-x-3.5 bottom-3.5 flex flex-wrap gap-1.5">
          {FEATURED_MOLECULES.map((m) => {
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
                  active ? "border-cyan text-cyan shadow-[inset_0_0_14px_var(--glow-soft)]" : "border-line hover:border-cyan-dim",
                )}
              >
                {m.formula}
              </button>
            );
          })}
        </div>
      </MoleculeViewer>

      {/* Молекула деректері */}
      <dl className="m-0 grid grid-cols-3 gap-px border-t border-line bg-line">
        <Fact label={t("facts.mass")} value={`${mass} ${t("massUnit")}`} />
        <Fact label={t("facts.shape")} value={tm(`${molecule.id}.shape`)} />
        <Fact label={t("facts.angle")} value={angle} />
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
