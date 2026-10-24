import { resetEngineStats, setEngineEmitter, step } from "@/features/chem-engine";
import { makeFmt, type Tr } from "../game/i18n";
import { addLog, installEngineEmitter } from "../game/journal";
import type { HudStore, PromptView } from "../game/store";
import { primaryDown, primaryUp, renderHand, returnHome } from "../interaction/actions";
import { aim } from "../interaction/aim";
import { decide, nm, type Decision } from "../interaction/decide";
import { populate } from "../items/populate";
import { bindDesktop, movePlayer, requestLock } from "../player/controls";
import { makeRig } from "../player/hands";
import { buildBench } from "../scene/bench";
import { buildBurette } from "../scene/burette";
import { buildCabinets } from "../scene/cabinets";
import { buildLamp } from "../scene/lamp";
import { buildPpe } from "../scene/ppe";
import { buildRoom } from "../scene/room";
import { createEffects } from "../systems/effects";
import { gasStep } from "../systems/gas";
import { renderLook } from "../systems/look";
import { updateObjects } from "../systems/objects";
import { vesselVisual } from "../systems/visuals";
import { createBase, type Game } from "./context";
import { addLights } from "./renderer";
import { disposeScene } from "./three-utils";

/** React жағынан ойынды басқару */
export type GameApi = {
  /** «Зертханаға кіру» / «Жалғастыру» */
  start: () => void;
  /** «?» — басқару туралы терезені қайта ашу (ойын тоқтайды) */
  showHelp: () => void;
  setSpeed: (speed: number) => void;
  dispose: () => void;
};

/**
 * 3D зертхананы құру. Canvas осы жерде жасалады (container ішіне), сондықтан React StrictMode
 * компонентті екі рет іске қосса да әр ойынның өз WebGL контексті болады.
 */
export function createGame(opts: { container: HTMLElement; store: HudStore; tr: Tr; locale: string; canvasLabel: string }): GameApi {
  const { container, store, tr, locale } = opts;
  const canvas = document.createElement("canvas");
  canvas.className = "block size-full touch-none";
  canvas.setAttribute("aria-label", opts.canvasLabel);
  container.appendChild(canvas);

  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const base = createBase({ canvas, tr, fmt: makeFmt(locale), locale, store, isTouch, reducedMotion });
  addLights(base.scene, isTouch);
  buildRoom(base);
  const { bench, hp } = buildBench(base);
  const cabinets = buildCabinets(base);
  const ppe = buildPpe(base);
  const bur = buildBurette(base, bench);
  const lamp = buildLamp(base, bench);
  const parts = populate(base, cabinets, bench);

  const G: Game = {
    ...base,
    ...parts,
    state: {
      speed: 1,
      goggles: false,
      gloves: false,
      heaterOn: false,
      held: null,
      heldL: null,
      pour: null,
      pourAmt: 0,
      pourStartT: 0,
      xp: 0,
      safety: 100,
      gameT: 0,
      done: new Set(),
      warned: {},
      started: false,
      paused: false,
      locked: false,
      lockFailed: false,
    },
    stats: { pop: false, o2: false, co2splint: false, filter: false, twohand: false, titr: false, lamp: false },
    player: { x: 0, z: 2.6, yaw: 0, pitch: -0.12, bob: 0, stepAcc: 0 },
    keys: {},
    joy: { x: 0, y: 0 },
    aimRes: null,
    cooldown: 0,
    bench,
    hp,
    cabinets,
    ppe,
    bur,
    lamp,
    rigR: makeRig(base, 1),
    rigL: makeRig(base, -1),
    fx: createEffects(base),
  };
  const { state, renderer, scene, camera, player } = G;

  // Жаңа ойын — таза журнал мен HUD (React әзірлеу режимінде компонентті екі рет іске қосады)
  store.set({ welcome: "first", speed: 1, prompt: null, cross: false, look: null, hand: null, toast: null, log: [] });
  resetEngineStats();
  installEngineEmitter(G);
  renderHand(G);
  addLog(G, "", tr("log.lab"), "", tr("log.start"));

  const resize = () => {
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);

  const setSpeed = (speed: number) => {
    state.speed = speed;
    store.set({ speed });
  };
  const unbind = bindDesktop(G, {
    primaryDown: () => primaryDown(G),
    primaryUp: () => primaryUp(G),
    returnHome: (left) => returnHome(G, left),
    setSpeed,
  });

  // ---------- HUD-қа шығару (тек өзгергенде) ----------
  let lastPrompt = "";
  const lastLook = { json: "" };
  const updatePrompt = (dcs: Decision | null, dl: Decision | null) => {
    let view: PromptView | null = null;
    if ((dcs || dl) && state.started && !state.paused) {
      view = {
        main: dcs ? { key: dcs.act ? (isTouch ? tr("touch.right") : "E") : undefined, text: dcs.text } : null,
        amount: state.pour && !state.pour.dropOnly ? `+${G.fmt(state.pourAmt)} ${tr("units.ml")}` : null,
        alt: dl && dl.act ? { key: isTouch ? tr("touch.left") : "F", text: dl.text } : null,
      };
    }
    const cross = !!(dcs?.act || dl?.act);
    const json = JSON.stringify(view) + cross;
    if (json === lastPrompt) return;
    lastPrompt = json;
    store.set({ prompt: view, cross });
  };

  // ---------- ойын циклі ----------
  let last = performance.now();
  let uiT = 0;
  let raf = 0;
  const tick = (now: number) => {
    const rdt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.cooldown = Math.max(0, G.cooldown - rdt);
    movePlayer(G, rdt);
    camera.position.set(player.x, 1.6 + Math.sin(player.bob * 2) * 0.012, player.z);
    camera.rotation.set(player.pitch, player.yaw, 0);
    camera.updateMatrixWorld();

    // Химия 0,1 с қадаммен есептеледі (×5 / ×20 жылдамдатқанда да дәл)
    let gdt = rdt * state.speed;
    state.gameT += gdt;
    while (gdt > 1e-6) {
      const d = Math.min(0.1, gdt);
      for (const o of G.vessels) step(o.s, d, state.heaterOn);
      gasStep(G, d);
      gdt -= d;
    }
    updateObjects(G, rdt);
    for (const o of G.vessels) vesselVisual(o, rdt);

    G.aimRes = aim(G);
    let dcs = decide(G);
    if (state.pour && !state.pour.dropOnly && state.held) {
      const t = state.pour.target;
      dcs = { act: "pour", text: tr("prompt.pouring", { from: nm(G, state.held), to: t.type === "funnel" ? tr("prompt.funnel") : t.name }) };
    }
    updatePrompt(dcs, null);
    renderer.render(scene, camera);
    uiT += rdt;
    if (uiT > 0.15) {
      uiT = 0;
      renderLook(G, lastLook);
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  // Тек әзірлеу кезінде: браузер консолінен / автотесттен ойынды тексеру үшін (прототиптегі window.__lab)
  const debug = window as unknown as { __lab?: Game };
  if (process.env.NODE_ENV !== "production") debug.__lab = G;

  return {
    start: () => {
      store.set({ welcome: null });
      state.started = true;
      state.paused = false;
      requestLock(G);
    },
    showHelp: () => {
      primaryUp(G);
      state.paused = true;
      store.set({ welcome: "again" });
      if (document.pointerLockElement) document.exitPointerLock();
    },
    setSpeed,
    dispose: () => {
      cancelAnimationFrame(raf);
      if (debug.__lab === G) delete debug.__lab;
      unbind();
      ro.disconnect();
      setEngineEmitter(null);
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
