"use client";

import { useEffect, useImperativeHandle, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import type { AtomSpec, GLViewer } from "3dmol";
import { useLocale, useTranslations } from "next-intl";
import { formatAtomicMass, formatElectronegativity } from "@/lib/chemistry/element-format";
import { getElement } from "@/lib/chemistry/elements";
import { analyzeMolecule, angleBetween, distance, hydrogenBonds, length, type Vec } from "@/lib/chemistry/molecule-geometry";
import type { Molecule } from "@/lib/chemistry/molecules";
import { parseMolfile, type MolGraph } from "@/lib/chemistry/molfile";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";

export type ViewStyle = "ballStick" | "spaceFill" | "line";
export const VIEW_STYLES: ViewStyle[] = ["ballStick", "spaceFill", "line"];

/** Молекула бетіндегі қосымша құралдар (басқа жерлерде әдепкі бойынша өшік) */
export type ViewerTools = { labels?: boolean; lonePairs?: boolean; polarity?: boolean; measure?: boolean };

// 3Dmol стильдері (атом түстері — Jmol/CPK: C сұр, O қызыл, H ақ, N көк, S сары, Cl жасыл, Na күлгін)
function styleSpec(style: ViewStyle, hasBonds: boolean) {
  switch (style) {
    case "spaceFill":
      return { sphere: { scale: 1, colorscheme: "Jmol" } };
    case "line":
      return hasBonds ? { stick: { radius: 0.05, colorscheme: "Jmol" } } : { sphere: { scale: 0.18, colorscheme: "Jmol" } };
    default:
      // Байланысы жоқ кристалда (NaCl) шарлар үлкенірек
      return hasBonds
        ? { stick: { radius: 0.14, colorscheme: "Jmol" }, sphere: { scale: 0.28, colorscheme: "Jmol" } }
        : { sphere: { scale: 0.45, colorscheme: "Jmol" } };
  }
}

/** Молекуланы рамкаға сыйдыру: 3Dmol атом центрлерін ғана есептейді, көлемді шарларға (және байланыссыз тордың үлкен шарларына) қосымша орын керек */
function fitToView(viewer: GLViewer, style: ViewStyle, hasBonds: boolean) {
  viewer.zoomTo();
  if (style === "spaceFill") viewer.zoom(0.7);
  else if (!hasBonds) viewer.zoom(0.8);
}

// Қабаттама түстері: бөлінбеген жұп — сары, δ− — қызыл, δ+ — көк, өлшеу — көгілдір
const LONE_PAIR = "#ffc53d";
const NEGATIVE = "#ff4d5e";
const POSITIVE = "#3b9dff";
const MEASURE = "#3fe0f0";
const add = (a: Vec, b: Vec, k = 1): Vec => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });

/** Сырттан басқару (қол қимылы үшін) */
export type MoleculeViewerApi = {
  /** Градуспен айналдыру: dx — тік ось бойынша, dy — көлденең ось бойынша */
  rotate: (dxDegrees: number, dyDegrees: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  setSpinning: (spinning: boolean) => void;
  /** Көріністің PNG суреті (фоны мөлдір) */
  png: () => string | null;
};

type Props = {
  molecule: Molecule;
  /** Қол қимылымен басқару үшін (gesture-lab) */
  apiRef?: Ref<MoleculeViewerApi>;
  viewStyle: ViewStyle;
  /** Бар болса, құралдар тақтасында стильді ауыстыру батырмасы шығады */
  onCycleStyle?: () => void;
  className?: string;
  /** Атом картасының орны (басқа элементтермен қабаттаспауы үшін) */
  atomCardClassName?: string;
  tools?: ViewerTools;
  /** Құрылым жүктелгенде (молекула бетіндегі талдау үшін) */
  onGraph?: (graph: MolGraph) => void;
  /** 3Dmol көрінісі дайын болғанда (екі көріністі байланыстыру үшін) */
  onViewer?: (viewer: GLViewer) => void;
  /** Автоматты айналу басында қосулы ма */
  spin?: boolean;
  /** Көрініс үстіндегі қосымша элементтер (формула, молекула таңдау т.б.) */
  children?: ReactNode;
};

/**
 * 3D молекула көрінісі (3Dmol.js). Тышқанмен/саусақпен айналдыру, екі саусақпен үлкейту,
 * атомды басқанда — элемент атауы, массасы, электртерістігі; құралдар: белгілер, өлшеу, электрон жұптары, полюстілік.
 */
export function MoleculeViewer({
  molecule,
  apiRef,
  viewStyle,
  onCycleStyle,
  className,
  atomCardClassName,
  tools = {},
  onGraph,
  onViewer,
  spin = true,
  children,
}: Props) {
  const t = useTranslations("MoleculeViewer");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GLViewer | null>(null);
  const hasBondsRef = useRef(true);
  const viewStyleRef = useRef(viewStyle);
  const measureRef = useRef(false);
  const callbacks = useRef({ onGraph, onViewer });
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [spinning, setSpinning] = useState(spin);
  const [atomIndex, setAtomIndex] = useState<number | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [graph, setGraph] = useState<MolGraph | null>(null);

  useEffect(() => {
    callbacks.current = { onGraph, onViewer };
  });

  // 1) 3Dmol кітапханасын жүктеп, көрініс жасау (тек браузерде, бір рет)
  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;
    let observer: ResizeObserver | undefined;

    // 3Dmol ауыр (~570 КБ): 3D терезесі экранға көрінгенде және браузер бос болғанда ғана жүктейміз —
    // телефонда бет мәтіні алдымен шығады
    let visibility: IntersectionObserver | undefined;
    const visibleAndIdle = new Promise<void>((resolve) => {
      visibility = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        visibility?.disconnect();
        // Safari-де requestIdleCallback жоқ — қысқа кідіріспен жүктейміз
        if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(() => resolve(), { timeout: 1500 });
        else setTimeout(resolve, 200);
      });
      visibility.observe(container);
    });

    visibleAndIdle
      .then(() => import("3dmol"))
      .then(($3Dmol) => {
        if (cancelled) return;
        // minimumZoomToDistance: әдепкі 5 Å — су сияқты кіші молекулалар тым кішкентай көрінеді
        const viewer = $3Dmol.createViewer(container, { backgroundAlpha: 0, antialias: true, minimumZoomToDistance: 2.5 });
        viewerRef.current = viewer;
        observer = new ResizeObserver(() => viewer.resize());
        observer.observe(container);
        callbacks.current.onViewer?.(viewer);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
      visibility?.disconnect();
      observer?.disconnect();
      viewerRef.current?.clear();
      viewerRef.current = null;
      container.innerHTML = "";
    };
  }, []);

  // 2) Молекуланы жүктеу (молекула ауысқанда)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!ready || !viewer) return;
    let cancelled = false;

    fetch(molecule.sdf)
      .then((res) => {
        if (!res.ok) throw new Error(`SDF ${res.status}`);
        return res.text();
      })
      .then((sdf) => {
        if (cancelled) return;
        viewer.removeAllModels();
        const model = viewer.addModel(sdf, "sdf");
        const parsed = parseMolfile(sdf);
        hasBondsRef.current = model.selectedAtoms({}).some((a: AtomSpec) => (a.bonds?.length ?? 0) > 0);
        viewer.setStyle({}, styleSpec(viewStyleRef.current, hasBondsRef.current));
        viewer.setClickable({}, true, (atom: AtomSpec) => {
          const index = atom.index ?? null;
          setAtomIndex(index);
          // Өлшеу режимінде: 1–3 атом таңдалады, төртінші басу жаңадан бастайды
          if (measureRef.current && index !== null) setPicked((p) => (p.length >= 3 ? [index] : p.includes(index) ? p : [...p, index]));
        });
        fitToView(viewer, viewStyleRef.current, hasBondsRef.current);
        viewer.render();
        setAtomIndex(null);
        setPicked([]);
        setGraph(parsed);
        setStatus("ok");
        callbacks.current.onGraph?.(parsed);
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [ready, molecule.sdf]);

  // 3) Стиль ауысқанда қайта бояу
  useEffect(() => {
    viewStyleRef.current = viewStyle;
    const viewer = viewerRef.current;
    if (!viewer || status !== "ok") return;
    viewer.setStyle({}, styleSpec(viewStyle, hasBondsRef.current));
    // Көлемді стильде шарлар үлкейеді — молекула рамкаға сыюы үшін қайта сыйдырамыз
    fitToView(viewer, viewStyle, hasBondsRef.current);
    viewer.render();
  }, [viewStyle, status]);

  // 4) Автоматты айналу (қозғалысты азайту баптауы қосулы болса — тоқтатылады)
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || status !== "ok") return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (spinning && !reduceMotion) viewer.spin("y", 0.6);
    else viewer.spin(false);
  }, [spinning, status]);

  // 5) Қабаттамалар: белгілер, электрон жұптары, δ± және диполь, сутектік байланыстар, өлшеу
  const { labels, lonePairs, polarity, measure } = tools;
  useEffect(() => {
    measureRef.current = !!measure;
  }, [measure]);
  const measured = useMemo(() => (measure ? picked : []), [measure, picked]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !graph || status !== "ok") return;
    viewer.removeAllShapes();
    viewer.removeAllLabels();
    const { atoms } = graph;
    const analysis = lonePairs || polarity ? analyzeMolecule(graph) : null;
    // Жартылай мөлдір қараңғы фон — белгі ашық және қараңғы режимде де оқылады
    const label = (text: string, position: Vec, color: string, size = 13) =>
      viewer.addLabel(text, { position, fontSize: size, fontColor: color, backgroundColor: "#0b1220", backgroundOpacity: 0.6, inFront: true, alignment: "center" });

    if (labels) atoms.forEach((a) => label(a.elem, a, "#ffffff", 12));

    if (analysis && lonePairs) {
      analysis.atoms.forEach((info, i) =>
        info.lonePairDirections.forEach((d) => {
          // Жұп — мөлдір «бұлт» және оның ішіндегі екі электрон
          const center = add(atoms[i], d, 0.62);
          viewer.addSphere({ center, radius: 0.3, color: LONE_PAIR, alpha: 0.5 });
          const side = Math.abs(d.x) < 0.9 ? { x: 0, y: -d.z, z: d.y } : { x: -d.y, y: d.x, z: 0 };
          const k = 0.09 / (length(side) || 1);
          for (const s of [k, -k]) viewer.addSphere({ center: add(center, side, s), radius: 0.06, color: LONE_PAIR });
        }),
      );
    }

    if (analysis && polarity) {
      analysis.atoms.forEach((info, i) => {
        if (Math.abs(info.partialCharge) < 0.1) return;
        const negative = info.partialCharge < 0;
        label(negative ? "δ−" : "δ+", add(atoms[i], { x: 0, y: 0.55, z: 0 }), negative ? NEGATIVE : POSITIVE, 15);
      });
      if (analysis.polar) {
        // Бағыттауыш δ+ жағынан δ− жағына (химиядағы белгілеу): μ-ге қарама-қарсы
        // Ұзындығы молекуладан асады, ұшы δ− атомның сыртында көрінеді
        const center = atoms.reduce((s, a) => add(s, a, 1 / atoms.length), { x: 0, y: 0, z: 0 });
        const extent = Math.max(...atoms.map((a) => distance(a, center)));
        const dir = { x: -analysis.dipole.x, y: -analysis.dipole.y, z: -analysis.dipole.z };
        const unit = 1 / (length(dir) || 1);
        viewer.addArrow({ start: add(center, dir, -(extent + 0.3) * unit), end: add(center, dir, (extent + 0.9) * unit), radius: 0.07, radiusRatio: 2.4, mid: 0.85, color: LONE_PAIR });
      }
    }

    if (molecule.hydrogenBonds) {
      for (const [h, acceptor] of hydrogenBonds(graph)) {
        viewer.addCylinder({ start: atoms[h], end: atoms[acceptor], radius: 0.05, color: MEASURE, dashed: true, dashLength: 0.18, gapLength: 0.14, fromCap: 1, toCap: 1 });
      }
    }

    if (measured.length) {
      for (const i of measured) viewer.addSphere({ center: atoms[i], radius: 0.5, color: MEASURE, alpha: 0.35 });
      for (let k = 1; k < measured.length; k++) {
        const [a, b] = [atoms[measured[k - 1]], atoms[measured[k]]];
        viewer.addCylinder({ start: a, end: b, radius: 0.04, color: MEASURE, dashed: true, fromCap: 1, toCap: 1 });
        label(`${formatDecimal(distance(a, b), locale, 2)} Å`, add(a, { x: (b.x - a.x) / 2, y: (b.y - a.y) / 2, z: (b.z - a.z) / 2 }), MEASURE);
      }
      if (measured.length === 3) {
        const [a, b, c] = measured.map((i) => atoms[i]);
        label(`${formatDecimal(angleBetween(a, b, c), locale, 1)}°`, add(b, { x: 0, y: -0.6, z: 0 }), LONE_PAIR, 15);
      }
    }
    viewer.render();
  }, [graph, status, labels, lonePairs, polarity, measured, molecule.hydrogenBonds, locale]);

  const zoom = (factor: number) => viewerRef.current?.zoom(factor, 250);
  const reset = () => {
    if (viewerRef.current) fitToView(viewerRef.current, viewStyleRef.current, hasBondsRef.current);
    setAtomIndex(null);
    setPicked([]);
  };

  useImperativeHandle(apiRef, () => ({
    rotate: (dx, dy) => {
      const viewer = viewerRef.current;
      if (!viewer) return;
      if (dx) viewer.rotate(dx, "y");
      if (dy) viewer.rotate(dy, "x");
    },
    zoom: (factor) => viewerRef.current?.zoom(factor),
    reset,
    setSpinning,
    // Сурет кадр сызылған бойда алынады (WebGL буфері әлі тазаланбаған)
    png: () => {
      const viewer = viewerRef.current;
      if (!viewer) return null;
      viewer.render();
      return viewer.pngURI();
    },
  }));

  const atom = atomIndex !== null && graph ? graph.atoms[atomIndex] : undefined;
  const element = atom ? getElement(atom.elem) : undefined;
  const electronegativity = element ? formatElectronegativity(element, locale) : null;
  // Кристалда шеткі атомдардың көршісі аз — гибридтенуді тек молекулаларға көрсетеміз
  const atomInfo = atom && graph && molecule.group !== "crystal" ? analyzeMolecule(graph).atoms[atomIndex!] : null;
  const measurement = graph ? measureText(graph, measured, locale) : null;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* 3Dmol осы элементтің ішіне canvas қосады */}
      <div ref={containerRef} role="img" aria-label={t("label")} className="absolute inset-0 touch-none" />

      {status !== "ok" && (
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          {status === "error" ? t("error") : t("loading")}
        </div>
      )}

      {children}

      {/* Құралдар тақтасы */}
      <div className="absolute top-3 right-3 flex gap-1.5">
        <ToolButton label={t("zoomIn")} onClick={() => zoom(1.25)}>
          +
        </ToolButton>
        <ToolButton label={t("zoomOut")} onClick={() => zoom(0.8)}>
          −
        </ToolButton>
        {onCycleStyle && (
          <ToolButton label={`${t("styleLabel")}: ${t(`styles.${viewStyle}`)}`} onClick={onCycleStyle}>
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <circle cx="5" cy="9" r="3" fill="currentColor" />
              <circle cx="13" cy="9" r="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M8 9h2" stroke="currentColor" strokeWidth="1.6" />
            </svg>
          </ToolButton>
        )}
        <ToolButton label={t("spin")} onClick={() => setSpinning((s) => !s)} pressed={spinning}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M14.5 9A5.5 5.5 0 113.6 6.5M3.5 2.5v4h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </ToolButton>
        <ToolButton label={t("reset")} onClick={reset}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M3 7V3h4M15 11v4h-4M3 3l5 5M15 15l-5-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </ToolButton>
      </div>

      {/* Өлшеу нәтижесі */}
      {measurement && (
        <p aria-live="polite" className="absolute bottom-3 left-3 rounded-[10px] border border-cyan-dim bg-overlay px-3 py-1.5 font-mono text-[0.85rem]">
          {measurement}
        </p>
      )}

      {/* Басылған атомның ақпараты */}
      {element && (
        <div
          aria-live="polite"
          className={cn(
            "absolute min-w-40 rounded-[10px] border border-cyan-dim bg-overlay px-3 py-2 text-[0.8rem] shadow-[0_1px_2px_var(--shadow)]",
            atomCardClassName ?? "right-3 bottom-3",
          )}
        >
          <button
            type="button"
            onClick={() => setAtomIndex(null)}
            aria-label={t("closeAtom")}
            className="absolute top-1 right-1.5 px-1 text-muted-foreground hover:text-foreground"
          >
            ×
          </button>
          <p className="pr-4">
            <b className="mr-1.5 font-mono text-base text-cyan">{element.symbol}</b>
            {element.name[locale]}
          </p>
          <p className="text-muted-foreground">
            {t("atomMass")}: {formatAtomicMass(element, locale)}
          </p>
          {electronegativity && (
            <p className="text-muted-foreground">
              {t("electronegativity")}: {electronegativity}
            </p>
          )}
          {atomInfo?.hybridization && (
            <p className="text-muted-foreground">
              {t("hybridization")}: <span className="font-mono">{atomInfo.hybridization.replace("2", "²").replace("3", "³")}</span>
            </p>
          )}
          {atomInfo && atomInfo.neighbors.length > 0 && atomInfo.lonePairs > 0 && (
            <p className="text-muted-foreground">
              {t("lonePairsCount")}: {atomInfo.lonePairs}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** «O–H: 0,96 Å · H–O–H: 104,5°» */
function measureText(graph: MolGraph, picked: number[], locale: Parameters<typeof formatDecimal>[1]) {
  if (picked.length < 2) return null;
  const atoms = picked.map((i) => graph.atoms[i]);
  const parts = [];
  for (let k = 1; k < atoms.length; k++) parts.push(`${atoms[k - 1].elem}–${atoms[k].elem}: ${formatDecimal(distance(atoms[k - 1], atoms[k]), locale, 2)} Å`);
  if (atoms.length === 3) parts.push(`${atoms.map((a) => a.elem).join("–")}: ${formatDecimal(angleBetween(atoms[0], atoms[1], atoms[2]), locale, 1)}°`);
  return parts.join(" · ");
}

function ToolButton({
  label,
  onClick,
  pressed,
  children,
}: {
  label: string;
  onClick: () => void;
  pressed?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      className={cn(
        "grid size-9 place-items-center rounded-[10px] border bg-overlay font-bold transition-colors hover:border-cyan-dim",
        pressed ? "border-cyan text-cyan" : "border-line",
      )}
    >
      {children}
    </button>
  );
}
