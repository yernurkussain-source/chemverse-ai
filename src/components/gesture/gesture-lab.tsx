"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MoleculeViewer, VIEW_STYLES, type MoleculeViewerApi, type ViewStyle } from "@/components/molecules/molecule-viewer";
import { classifyHand, smoothHands, type Gesture, type Point } from "@/features/gesture/classify";
import { useHandTracking } from "@/features/gesture/use-hand-tracking";
import { MOLECULES as ALL_MOLECULES } from "@/lib/chemistry/molecules";
import { cn } from "@/lib/utils";

// Қол қимылымен ауыстыруға ыңғайлы болуы үшін — алғашқы 10 молекула (жұдырықпен 46-ны айналып шығу ұзақ)
const LAB_IDS = ["h2o", "co2", "ch4", "nh3", "ethanol", "benzene", "nacl", "h2so4", "glucose", "caffeine"];
const MOLECULES = ALL_MOLECULES.filter((m) => LAB_IDS.includes(m.id));
const LEGEND: Exclude<Gesture, "none">[] = ["point", "pinch", "fist", "open", "victory"];
const SMOOTHING_FRAMES = 5;
const HOLD_MS = { fist: 500, open: 400, victory: 400 } as const;
const ROTATE_DEGREES_PER_UNIT = 320;
const ZOOM_PER_UNIT = 4;

/** Қол қимылымен 3D молекуланы басқару зертханасы (BLUEPRINT 10.2) */
export function GestureLab() {
  const t = useTranslations("GestureLab");
  const tm = useTranslations("Molecules");
  const viewerApi = useRef<MoleculeViewerApi>(null);
  const [moleculeIndex, setMoleculeIndex] = useState(0);
  const [viewStyle, setViewStyle] = useState<ViewStyle>("ballStick");
  const [gesture, setGesture] = useState<Gesture>("none");
  const [handVisible, setHandVisible] = useState(false);

  // Әр кадрда өзгеретін мәндер — state емес, ref (бет 30 рет/сек қайта сызылмауы үшін)
  const history = useRef<Point[][]>([]);
  const previous = useRef<Point | null>(null);
  const current = useRef<{ gesture: Gesture; since: number; fired: boolean }>({ gesture: "none", since: 0, fired: false });

  const molecule = MOLECULES[moleculeIndex];

  // now — кадрдың уақыты (hook береді): бет сызылу кезінде уақыт оқылмауы керек
  function handleFrame(hand: Point[] | null, now: number) {
    const api = viewerApi.current;
    if (!hand) {
      history.current = [];
      previous.current = null;
      setHandVisible(false);
      changeGesture("none", now);
      return;
    }
    setHandVisible(true);
    history.current = [...history.current, hand].slice(-SMOOTHING_FRAMES);
    const smooth = smoothHands(history.current);
    if (!smooth) return;
    const detected = classifyHand(smooth);
    changeGesture(detected, now);
    const state = current.current;

    switch (detected) {
      case "point": {
        // Сұқ саусақтың ұшы (8) жылжыған сайын айналдыру. Кескін айнадай көрсетіледі, сондықтан x таңбасы кері.
        const tip = smooth[8];
        if (previous.current && api) {
          api.rotate(-(tip.x - previous.current.x) * ROTATE_DEGREES_PER_UNIT, (tip.y - previous.current.y) * ROTATE_DEGREES_PER_UNIT);
        }
        previous.current = tip;
        break;
      }
      case "pinch": {
        // Шымшыған нүкте жоғары көтерілсе — үлкейту, төмен түссе — кішірейту
        const point = { x: (smooth[4].x + smooth[8].x) / 2, y: (smooth[4].y + smooth[8].y) / 2 };
        if (previous.current && api) {
          const factor = 1 - (point.y - previous.current.y) * ZOOM_PER_UNIT;
          api.zoom(Math.min(1.15, Math.max(0.87, factor)));
        }
        previous.current = point;
        break;
      }
      case "fist":
      case "open":
      case "victory": {
        // Бір реттік әрекет: қимылды сәл ұстағанда бір рет орындалады
        if (state.fired || now - state.since < HOLD_MS[detected]) break;
        state.fired = true;
        if (detected === "fist") setMoleculeIndex((i) => (i + 1) % MOLECULES.length);
        if (detected === "open") api?.reset();
        if (detected === "victory") setViewStyle((s) => VIEW_STYLES[(VIEW_STYLES.indexOf(s) + 1) % VIEW_STYLES.length]);
        break;
      }
    }
  }

  function changeGesture(next: Gesture, now: number) {
    if (current.current.gesture === next) return;
    current.current = { gesture: next, since: now, fired: false };
    previous.current = null;
    setGesture(next);
    // Қол басқара бастағанда автоматты айналу тоқтайды
    if (next !== "none") viewerApi.current?.setSpinning(false);
  }

  const { videoRef, canvasRef, state, start, stop } = useHandTracking(handleFrame);
  const running = state === "running";
  const errorKey = state === "denied" || state === "unavailable" || state === "insecure" || state === "model" ? state : null;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)] shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
        <MoleculeViewer
          apiRef={viewerApi}
          molecule={molecule}
          viewStyle={viewStyle}
          onCycleStyle={() => setViewStyle((s) => VIEW_STYLES[(VIEW_STYLES.indexOf(s) + 1) % VIEW_STYLES.length])}
          className="aspect-square w-full"
          atomCardClassName="top-15 right-3"
        >
          <div className="pointer-events-none absolute top-3.5 left-3.5 font-mono text-2xl font-semibold" aria-live="polite">
            {molecule.formula}
            <small className="block font-sans text-[0.8rem] font-medium text-muted-foreground">{tm(`${molecule.id}.name`)}</small>
          </div>

          {/* Бұрыштағы камера терезесі (айнадай) + қол «қаңқасы» */}
          <div
            className={cn(
              "absolute bottom-3 left-3 aspect-[4/3] w-36 overflow-hidden rounded-xl border-2 border-cyan bg-black shadow-[0_0_22px_var(--glow)] sm:w-52",
              !running && "hidden",
            )}
            role="img"
            aria-label={t("cameraLabel")}
          >
            <video ref={videoRef} muted playsInline className="absolute inset-0 size-full -scale-x-100 object-cover" />
            <canvas ref={canvasRef} className="absolute inset-0 size-full -scale-x-100 object-cover" />
          </div>
        </MoleculeViewer>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        {/* Камера: рұқсат / күйі */}
        <div className="rounded-2xl border border-line bg-panel p-4">
          {running ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-[0.9rem] font-semibold">
                <span className="size-2.5 rounded-full bg-good shadow-[0_0_10px_var(--good)]" aria-hidden="true" />
                {t("running")}
              </span>
              <Button variant="panel" size="pill-sm" onClick={stop}>
                {t("stop")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="font-display font-semibold">{t("consentTitle")}</p>
              <p className="text-[0.88rem] text-muted-foreground">{t("consentText")}</p>
              <Button variant="glow" size="pill" onClick={start} disabled={state === "loading"} className="self-start">
                {state === "loading" ? t("loading") : t("start")}
              </Button>
              {errorKey && (
                <p role="alert" className="rounded-[10px] border border-pink/40 bg-pink/10 px-3 py-2 text-[0.85rem] text-pink">
                  {t(`errors.${errorKey}`)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Қазіргі қимыл */}
        {running && (
          <div className="rounded-2xl border border-cyan-dim bg-linear-135 from-task-a to-task-b p-4" aria-live="polite">
            <p className="font-mono text-[0.72rem] tracking-[0.08em] text-muted-foreground uppercase">{t("current")}</p>
            <p className="mt-1 font-display text-xl font-bold">
              {handVisible ? t(`gestures.${gesture}.name`) : t("noHand")}
            </p>
            {handVisible && <p className="text-[0.85rem] text-muted-foreground">{t(`gestures.${gesture}.action`)}</p>}
          </div>
        )}

        {/* Қимылдар тізімі */}
        <ul className="grid gap-2">
          {LEGEND.map((g) => (
            <li
              key={g}
              className={cn(
                "grid gap-0.5 rounded-[14px] border px-3.5 py-2.5 text-[0.88rem] transition-colors min-[480px]:grid-cols-[150px_1fr] min-[480px]:gap-3",
                running && gesture === g ? "border-cyan bg-glow-soft" : "border-line bg-panel",
              )}
            >
              <b className="font-mono text-[0.85rem] font-semibold text-cyan">{t(`gestures.${g}.name`)}</b>
              <span>{t(`gestures.${g}.action`)}</span>
            </li>
          ))}
        </ul>

        {/* Молекула таңдау (камерасыз да) */}
        <div role="group" aria-label={t("moleculeLabel")} className="flex flex-wrap gap-1.5">
          {MOLECULES.map((m, i) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={i === moleculeIndex}
              title={tm(`${m.id}.name`)}
              onClick={() => setMoleculeIndex(i)}
              className={cn(
                "min-h-9 rounded-[9px] border px-2.5 py-1.5 font-mono text-[0.82rem] transition-colors",
                i === moleculeIndex ? "border-cyan text-cyan" : "border-line bg-panel hover:border-cyan-dim",
              )}
            >
              {m.formula}
            </button>
          ))}
        </div>
        <p className="text-[0.82rem] text-muted-foreground">{t("mouseHint")}</p>
      </div>
    </div>
  );
}
