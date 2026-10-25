"use client";

import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getElement } from "@/lib/chemistry/elements";
import { analyzeMolecule, bondKind, bondTypes, type BondKind } from "@/lib/chemistry/molecule-geometry";
import { getMolecule, type Molecule, type MoleculeId } from "@/lib/chemistry/molecules";
import type { MolGraph } from "@/lib/chemistry/molfile";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";
import { MoleculeViewer, type MoleculeViewerApi, type ViewerTools, type ViewStyle } from "./molecule-viewer";
import { StyleSwitch } from "./style-switch";

type Tool = keyof ViewerTools;

/** Молекула бетіндегі үлкен 3D көрініс + стиль, құралдар (белгі, өлшеу, электрон жұптары, полюстілік, PNG) және талдау */
export function MoleculeDetailViewer({ id }: { id: MoleculeId }) {
  const t = useTranslations("MoleculeViewer");
  const [viewStyle, setViewStyle] = useState<ViewStyle>("ballStick");
  const [tools, setTools] = useState<ViewerTools>({});
  const [graph, setGraph] = useState<MolGraph | null>(null);
  const api = useRef<MoleculeViewerApi>(null);
  const molecule = getMolecule(id);
  if (!molecule) return null;

  const crystal = molecule.group === "crystal";
  const available: Tool[] = crystal ? ["labels", "measure"] : ["labels", "measure", "lonePairs", "polarity"];
  const toggle = (tool: Tool) => setTools((current) => ({ ...current, [tool]: !current[tool] }));

  function downloadPng() {
    const url = api.current?.png();
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = `${molecule!.id}.png`;
    link.click();
  }

  const hints = [
    tools.measure && t("measureHint"),
    tools.lonePairs && t("lonePairsHint"),
    tools.polarity && t("polarityHint"),
    molecule.hydrogenBonds && t("hbonds"),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)] shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
        <MoleculeViewer apiRef={api} molecule={molecule} viewStyle={viewStyle} tools={tools} onGraph={setGraph} className="aspect-square w-full" />
      </div>
      <StyleSwitch value={viewStyle} onChange={setViewStyle} />

      <div role="group" aria-label={t("tools")} className="flex flex-wrap gap-1.5">
        {available.map((tool) => (
          <button
            key={tool}
            type="button"
            aria-pressed={!!tools[tool]}
            onClick={() => toggle(tool)}
            className={cn(
              "min-h-9 rounded-full border px-3.5 text-[0.82rem] font-semibold transition-colors",
              tools[tool] ? "border-cyan bg-cyan/15 text-cyan" : "border-line bg-panel hover:border-cyan-dim",
            )}
          >
            {t(tool)}
          </button>
        ))}
        <button
          type="button"
          onClick={downloadPng}
          className="min-h-9 rounded-full border border-line bg-panel px-3.5 text-[0.82rem] font-semibold hover:border-cyan-dim"
        >
          ⤓ {t("png")}
        </button>
      </div>
      {hints.length > 0 && (
        <ul className="m-0 flex flex-col gap-1 pl-4 text-[0.82rem] text-muted-foreground">
          {hints.map((hint) => (
            <li key={hint as string}>{hint}</li>
          ))}
        </ul>
      )}

      {graph && <MoleculeAnalysis molecule={molecule} graph={graph} />}
    </div>
  );
}

/** Байланыс түрлері, полюстілік және орталық атом (бейорганикалық молекулаларда) */
function MoleculeAnalysis({ molecule, graph }: { molecule: Molecule; graph: MolGraph }) {
  const t = useTranslations("MoleculesPage");
  const locale = useLocale();
  const crystal = molecule.group === "crystal";
  const elements = Object.keys(molecule.atoms);

  // Байланыссыз тор: бір элемент — металдық, екі элемент — иондық (NaCl)
  const bonds: { pair: string; delta: number; kind: BondKind | "metallic" }[] = graph.bonds.length
    ? bondTypes(graph)
    : elements.length === 1
      ? [{ pair: `${elements[0]}–${elements[0]}`, delta: 0, kind: "metallic" }]
      : (() => {
          const [a, b] = elements.map((e) => getElement(e)!).sort((x, y) => (x.electronegativity ?? 0) - (y.electronegativity ?? 0));
          const delta = Math.abs((b.electronegativity ?? 0) - (a.electronegativity ?? 0));
          return [{ pair: `${a.symbol}–${b.symbol}`, delta, kind: bondKind(delta) }];
        })();

  const analysis = crystal ? null : analyzeMolecule(graph);
  const central = analysis && (molecule.group === "simple" || molecule.group === "inorganic") ? centralAtom(graph, analysis.atoms) : null;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="text-[0.95rem] font-semibold">{t("bonds")}</h2>
      <ul className="mt-2 flex flex-col gap-1.5 text-[0.88rem]">
        {bonds.map((b) => (
          <li key={b.pair} className="flex flex-wrap items-baseline gap-x-2">
            <b className="font-mono">{b.pair}</b>
            {b.kind !== "metallic" && (
              <span className="font-mono text-[0.8rem] text-muted-foreground">
                {t("deltaEn")} = {formatDecimal(b.delta, locale, 2)}
              </span>
            )}
            <span>→ {t(`kinds.${b.kind}`)}</span>
          </li>
        ))}
      </ul>
      {analysis && (
        <p className="mt-3 text-[0.88rem]">
          <span className="text-muted-foreground">{t("polarity")}: </span>
          <b>{analysis.polar ? t("polar") : t("nonpolar")}</b>
        </p>
      )}
      {central && (
        <p className="mt-1 text-[0.88rem]">
          <span className="text-muted-foreground">{t("centralAtom")}: </span>
          <b className="font-mono">{t("centralValue", central)}</b>
        </p>
      )}
    </section>
  );
}

/** Орталық атом: H емес көршілері ең көп жалғыз атом (H₂O → O, SO₂ → S, H₂SO₄ → S); екіатомды молекулада жоқ */
function centralAtom(graph: MolGraph, atoms: ReturnType<typeof analyzeMolecule>["atoms"]) {
  const degree = atoms.map((a) => a.neighbors.length);
  const max = Math.max(...degree);
  if (max < 2 || degree.filter((d) => d === max).length > 1) return null;
  const i = degree.indexOf(max);
  const hybridization = atoms[i].hybridization?.replace("2", "²").replace("3", "³") ?? "—";
  return { symbol: graph.atoms[i].elem, hybridization, count: atoms[i].lonePairs };
}
