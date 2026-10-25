"use client";

import { useRef, useState } from "react";
import type { GLViewer } from "3dmol";
import { useLocale, useTranslations } from "next-intl";
import { inputClass } from "@/components/auth/form-parts";
import { Link } from "@/i18n/navigation";
import { getElement } from "@/lib/chemistry/elements";
import { analyzeMolecule } from "@/lib/chemistry/molecule-geometry";
import { getMolecule, molarMass, molecularFormula, MOLECULES, type Molecule, type MoleculeId } from "@/lib/chemistry/molecules";
import type { MolGraph } from "@/lib/chemistry/molfile";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MoleculeViewer } from "./molecule-viewer";

/** Дайын жұптар: изомерлер және аллотроптар */
const PRESETS: [MoleculeId, MoleculeId][] = [
  ["butane", "isobutane"],
  ["ethanol", "dimethyl-ether"],
  ["acetone", "propanal"],
  ["diamond", "graphite"],
  ["o2", "o3"],
  ["h2o", "ice"],
];

const sameAtoms = (a: Molecule, b: Molecule) =>
  Object.keys(a.atoms).length === Object.keys(b.atoms).length && Object.entries(a.atoms).every(([el, n]) => b.atoms[el] === n);

/** Екі молекула қатар: бірін айналдырса — екіншісі де бірге айналады */
export function MoleculeCompare({ initial }: { initial: [MoleculeId, MoleculeId] }) {
  const t = useTranslations("MoleculesPage.compare");
  const tm = useTranslations("Molecules");
  const [ids, setIds] = useState(initial);
  const viewers = useRef<(GLViewer | null)[]>([null, null]);

  function choose(index: 0 | 1, id: MoleculeId) {
    const next: [MoleculeId, MoleculeId] = index === 0 ? [id, ids[1]] : [ids[0], id];
    setIds(next);
    // Сілтемемен бөлісу үшін URL жаңарады (сервер сұранысынсыз)
    window.history.replaceState(null, "", `?a=${next[0]}&b=${next[1]}`);
  }

  // Екі көрініс те дайын болғанда — бір-біріне байланыстырамыз
  function onViewer(index: 0 | 1, viewer: GLViewer) {
    viewers.current[index] = viewer;
    const [a, b] = viewers.current;
    if (a && b) {
      a.linkViewer(b);
      b.linkViewer(a);
    }
  }

  const [a, b] = ids.map((id) => getMolecule(id)!);
  const elementsA = Object.keys(a.atoms);
  const verdict =
    a.id === b.id
      ? t("same")
      : sameAtoms(a, b) && a.group !== "crystal" && b.group !== "crystal"
        ? t("isomers", { formula: molecularFormula(a.atoms) })
        : elementsA.length === 1 && Object.keys(b.atoms).length === 1 && elementsA[0] in b.atoms
          ? t("allotropes", { element: getElement(elementsA[0])!.symbol })
          : sameAtoms(a, b)
            ? t("sameSubstance")
            : t("different");

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-1.5 text-[0.8rem] font-semibold">{t("presets")}</p>
        <ul className="flex flex-wrap gap-1.5">
          {PRESETS.map(([x, y]) => (
            <li key={`${x}-${y}`}>
              <button
                type="button"
                aria-pressed={ids[0] === x && ids[1] === y}
                onClick={() => {
                  setIds([x, y]);
                  window.history.replaceState(null, "", `?a=${x}&b=${y}`);
                }}
                className={cn(
                  "min-h-9 rounded-full border px-3.5 text-[0.82rem] font-semibold transition-colors",
                  ids[0] === x && ids[1] === y ? "border-cyan bg-cyan text-on-accent" : "border-line bg-panel hover:border-cyan-dim",
                )}
              >
                {tm(`${x}.name`)} ↔ {tm(`${y}.name`)}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <p aria-live="polite" className="rounded-2xl border border-cyan-dim bg-linear-135 from-task-a to-task-b px-4 py-3 text-[0.92rem] font-semibold">
        {verdict}
      </p>

      <div className="grid gap-5 lg:grid-cols-2">
        {([0, 1] as const).map((index) => (
          <ComparePanel
            key={index}
            label={t(index === 0 ? "first" : "second")}
            molecule={index === 0 ? a : b}
            onChange={(id) => choose(index, id)}
            onViewer={(viewer) => onViewer(index, viewer)}
          />
        ))}
      </div>
      <p className="text-[0.82rem] text-muted-foreground">{t("syncHint")}</p>
    </div>
  );
}

function ComparePanel({
  label,
  molecule,
  onChange,
  onViewer,
}: {
  label: string;
  molecule: Molecule;
  onChange: (id: MoleculeId) => void;
  onViewer: (viewer: GLViewer) => void;
}) {
  const t = useTranslations("MoleculesPage");
  const tm = useTranslations("Molecules");
  const tv = useTranslations("Viewer");
  const locale = useLocale();
  // Талдау қай молекуланікі екені бірге сақталады — молекула ауысқанда ескісі көрсетілмейді
  const [loaded, setLoaded] = useState<{ id: MoleculeId; graph: MolGraph } | null>(null);
  const polar = loaded?.id === molecule.id && molecule.group !== "crystal" ? analyzeMolecule(loaded.graph).polar : null;

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <label className="flex flex-col gap-1 text-[0.8rem] font-semibold">
        {label}
        <select value={molecule.id} onChange={(e) => onChange(e.target.value as MoleculeId)} className={cn(inputClass, "font-normal")}>
          {MOLECULES.map((m) => (
            <option key={m.id} value={m.id}>
              {m.formula} — {tm(`${m.id}.name`)}
            </option>
          ))}
        </select>
      </label>
      <div className="overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)]">
        <MoleculeViewer molecule={molecule} viewStyle="ballStick" spin={false} onViewer={onViewer} onGraph={(graph) => setLoaded({ id: molecule.id, graph })} className="aspect-square w-full" />
      </div>
      <dl className="m-0 grid grid-cols-2 gap-2 text-[0.88rem]">
        <div className="col-span-2 rounded-xl bg-panel-2 px-3 py-2">
          <dt className="font-mono text-[0.7rem] text-muted-foreground">{tm(`${molecule.id}.name`)}</dt>
          <dd className="m-0 font-mono text-lg font-semibold text-cyan">{molecule.formula}</dd>
        </div>
        <div className="rounded-xl bg-panel-2 px-3 py-2">
          <dt className="font-mono text-[0.7rem] text-muted-foreground">{tv("facts.mass")}</dt>
          <dd className="m-0 font-semibold">
            {formatDecimal(molarMass(molecule.atoms), locale)} {tv("massUnit")}
          </dd>
        </div>
        <div className="rounded-xl bg-panel-2 px-3 py-2">
          <dt className="font-mono text-[0.7rem] text-muted-foreground">{t("polarity")}</dt>
          <dd className="m-0 font-semibold">{polar === null ? "—" : polar ? t("polar") : t("nonpolar")}</dd>
        </div>
        <div className="col-span-2 rounded-xl bg-panel-2 px-3 py-2">
          <dt className="font-mono text-[0.7rem] text-muted-foreground">{tv("facts.shape")}</dt>
          <dd className="m-0 font-semibold">{tm(`${molecule.id}.shape`)}</dd>
        </div>
      </dl>
      <Link href={`/molecules/${molecule.id}`} className="self-start text-[0.85rem] font-semibold text-cyan hover:underline">
        {t("open")} →
      </Link>
    </section>
  );
}
