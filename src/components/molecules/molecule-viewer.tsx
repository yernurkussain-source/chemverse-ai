"use client";

import { useEffect, useImperativeHandle, useRef, useState, type ReactNode, type Ref } from "react";
import type { AtomSpec, GLViewer } from "3dmol";
import { useLocale, useTranslations } from "next-intl";
import { formatAtomicMass, formatElectronegativity } from "@/lib/chemistry/element-format";
import { getElement } from "@/lib/chemistry/elements";
import type { Molecule } from "@/lib/chemistry/molecules";
import { cn } from "@/lib/utils";

export type ViewStyle = "ballStick" | "spaceFill" | "line";
export const VIEW_STYLES: ViewStyle[] = ["ballStick", "spaceFill", "line"];

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

/** Молекуланы рамкаға сыйдыру: 3Dmol атом центрлерін ғана есептейді, көлемді шарларға қосымша орын керек */
function fitToView(viewer: GLViewer, style: ViewStyle) {
  viewer.zoomTo();
  if (style === "spaceFill") viewer.zoom(0.7);
}

/** Сырттан басқару (қол қимылы үшін) */
export type MoleculeViewerApi = {
  /** Градуспен айналдыру: dx — тік ось бойынша, dy — көлденең ось бойынша */
  rotate: (dxDegrees: number, dyDegrees: number) => void;
  zoom: (factor: number) => void;
  reset: () => void;
  setSpinning: (spinning: boolean) => void;
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
  /** Көрініс үстіндегі қосымша элементтер (формула, молекула таңдау т.б.) */
  children?: ReactNode;
};

/**
 * 3D молекула көрінісі (3Dmol.js). Тышқанмен/саусақпен айналдыру, екі саусақпен үлкейту,
 * атомды басқанда — элемент атауы, массасы, электртерістігі.
 */
export function MoleculeViewer({ molecule, apiRef, viewStyle, onCycleStyle, className, atomCardClassName, children }: Props) {
  const t = useTranslations("MoleculeViewer");
  const locale = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<GLViewer | null>(null);
  const hasBondsRef = useRef(true);
  const viewStyleRef = useRef(viewStyle);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [spinning, setSpinning] = useState(true);
  const [atomSymbol, setAtomSymbol] = useState<string | null>(null);

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
        const viewer = $3Dmol.createViewer(container, { backgroundAlpha: 0, antialias: true });
        viewerRef.current = viewer;
        observer = new ResizeObserver(() => viewer.resize());
        observer.observe(container);
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
        hasBondsRef.current = model.selectedAtoms({}).some((a: AtomSpec) => (a.bonds?.length ?? 0) > 0);
        viewer.setStyle({}, styleSpec(viewStyleRef.current, hasBondsRef.current));
        viewer.setClickable({}, true, (atom: AtomSpec) => setAtomSymbol(atom.elem ?? null));
        fitToView(viewer, viewStyleRef.current);
        viewer.render();
        setAtomSymbol(null);
        setStatus("ok");
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
    fitToView(viewer, viewStyle);
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

  const zoom = (factor: number) => viewerRef.current?.zoom(factor, 250);
  const reset = () => {
    if (viewerRef.current) fitToView(viewerRef.current, viewStyleRef.current);
    setAtomSymbol(null);
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
  }));

  const element = atomSymbol ? getElement(atomSymbol) : undefined;
  const electronegativity = element ? formatElectronegativity(element, locale) : null;

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
            onClick={() => setAtomSymbol(null)}
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
        </div>
      )}
    </div>
  );
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
