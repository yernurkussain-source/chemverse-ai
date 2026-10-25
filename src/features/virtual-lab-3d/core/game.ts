import * as THREE from "three";
import { resetEngineStats, setEngineEmitter, step } from "@/features/chem-engine";
import { soundStep } from "../audio/ambient";
import { createSound } from "../audio/snd";
import { makeFmt, type Tr } from "../game/i18n";
import { addLog, installEngineEmitter } from "../game/journal";
import { startProgress } from "../game/progress";
import { checkQuests, renderXP } from "../game/quests";
import { initialHud, type HudStore, type PromptView, type Quality } from "../game/store";
import type { TouchApi } from "../hud/TouchControls";
import { handView, primaryDown, primaryUp, renderHand, returnHome, secondaryDown } from "../interaction/actions";
import { aim } from "../interaction/aim";
import { decide, decideL, nm, type Decision, type DecisionL } from "../interaction/decide";
import { populate } from "../items/populate";
import { bindDesktop, bindTouchLook, movePlayer, requestLock } from "../player/controls";
import { makeRig } from "../player/hands";
import { buildBench } from "../scene/bench";
import { buildBurette } from "../scene/burette";
import { buildCabinets } from "../scene/cabinets";
import { buildLamp } from "../scene/lamp";
import { buildPpe } from "../scene/ppe";
import { buildRoom } from "../scene/room";
import { burStep } from "../systems/burette";
import { createEffects } from "../systems/effects";
import { gasStep } from "../systems/gas";
import { renderLook } from "../systems/look";
import { updateObjects } from "../systems/objects";
import { vesselVisual } from "../systems/visuals";
import { createBase, type Game } from "./context";
import { addLights } from "./renderer";
import { disposeScene } from "./three-utils";
import { answerMystery } from "../game/mystery";

/** React жағынан ойынды басқару */
export type GameApi = {
  /** «Зертханаға кіру» / «Жалғастыру» */
  start: () => void;
  /** «?» — басқару туралы терезені қайта ашу (ойын тоқтайды) */
  showHelp: () => void;
  setSpeed: (speed: number) => void;
  /** Журнал (оң жақтағы тартпа): ашу / жабу */
  toggleDrawer: (open?: boolean) => void;
  /** Тапсырмалар терезесі (ашық тұрғанда ойын тоқтайды) */
  setQuests: (open: boolean) => void;
  toggleSound: () => void;
  /** Кез келген басу: браузер дыбысты тек содан кейін қосуға рұқсат береді */
  unlockAudio: () => void;
  /** «Сапа»: high — көлеңкемен, low — көлеңкесіз (таңдау браузерде есте сақталады) */
  setQuality: (q: Quality) => void;
  /** «X» тапсырмасының жауабы: true — дұрыс, false — қате (X ауысты), null — бұрын шешілген */
  answerMystery: (guess: string) => boolean | null;
  /** Телефондағы джойстик пен батырмалар */
  touch: TouchApi;
  dispose: () => void;
};

const QUALITY_KEY = "chemverse.labGame.quality";

function readQuality(): Quality {
  try {
    return window.localStorage.getItem(QUALITY_KEY) === "low" ? "low" : "high";
  } catch {
    return "high";
  }
}

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
    snd: createSound(),
    flameSeen: new Set(),
    timers: new Set(),
    progress: { changed: () => {} },
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
  const { state, renderer, scene, camera, player, snd } = G;

  // Жаңа ойын — таза журнал мен HUD (React әзірлеу режимінде компонентті екі рет іске қосады)
  store.set({ ...initialHud(), touch: isTouch });
  resetEngineStats();
  installEngineEmitter(G);
  renderXP(G);
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

  // Сапа: төменде көлеңке өшеді және пиксель тығыздығы 1 (әлсіз телефондар үшін)
  const setQuality = (q: Quality) => {
    const high = q === "high";
    renderer.setPixelRatio(high ? Math.min(window.devicePixelRatio, isTouch ? 1.5 : 2) : 1);
    if (renderer.shadowMap.enabled !== high) {
      renderer.shadowMap.enabled = high;
      // Көлеңке қосылса / өшсе, материалдардың шейдерлері қайта жиналуы керек
      scene.traverse((o) => {
        const m = (o as THREE.Mesh).material;
        if (m) for (const mat of Array.isArray(m) ? m : [m]) mat.needsUpdate = true;
      });
    }
    resize();
    store.set({ quality: q });
  };
  setQuality(readQuality());

  const progress = startProgress(G);
  G.progress = progress;

  const exitLock = () => {
    if (document.pointerLockElement) document.exitPointerLock();
  };
  const setSpeed = (speed: number) => {
    state.speed = speed;
    store.set({ speed });
  };
  const toggleDrawer = (open?: boolean) => {
    const next = open ?? !store.get().drawer;
    store.set({ drawer: next });
    if (next) exitLock();
  };
  const setQuests = (open: boolean) => {
    store.set({ quests: open });
    state.paused = open || !!store.get().welcome;
    if (open) {
      primaryUp(G);
      exitLock();
    }
  };
  const unbindTouch = bindTouchLook(G);
  const unbind = bindDesktop(G, {
    primaryDown: () => primaryDown(G),
    primaryUp: () => primaryUp(G),
    secondaryDown: () => secondaryDown(G),
    returnHome: (left) => returnHome(G, left),
    setSpeed,
    toggleDrawer: () => toggleDrawer(),
    openQuests: () => setQuests(true),
    closeOverlays: () => {
      if (store.get().quests) setQuests(false);
      else if (store.get().drawer) toggleDrawer(false);
    },
  });

  // ---------- HUD-қа шығару (тек өзгергенде) ----------
  let lastPrompt = "";
  let lastHand = "";
  const lastLook = { json: "" };
  const updatePrompt = (dcs: Decision | null, dl: DecisionL | null) => {
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
  let qT = 0;
  let raf = 0;
  const tick = (now: number) => {
    const rdt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.cooldown = Math.max(0, G.cooldown - rdt);
    const moved = movePlayer(G, rdt);
    // prefers-reduced-motion: жүргенде бас тербелмейді
    camera.position.set(player.x, 1.6 + (reducedMotion ? 0 : Math.sin(player.bob * 2) * 0.012), player.z);
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
    burStep(G, rdt);
    for (const o of G.vessels) vesselVisual(o, rdt);
    soundStep(G, rdt, moved);

    G.aimRes = aim(G);
    let dcs = decide(G);
    const dl = decideL(G);
    if (state.pour && !state.pour.dropOnly && state.held) {
      const t = state.pour.target;
      dcs = { act: "pour", text: tr("prompt.pouring", { from: nm(G, state.held), to: t.type === "funnel" ? tr("prompt.funnel") : t.name }) };
    }
    updatePrompt(dcs, dl);
    renderer.render(scene, camera);
    uiT += rdt;
    if (uiT > 0.15) {
      uiT = 0;
      renderLook(G, lastLook);
      // Қолдағы заттың күйі өзгеруі мүмкін (шырпы жанып бітті, сымға сынама алынды)
      const hand = handView(G);
      const json = JSON.stringify(hand);
      if (json !== lastHand) {
        lastHand = json;
        store.set({ hand });
      }
    }
    qT += rdt;
    if (qT > 0.5) {
      qT = 0;
      checkQuests(G);
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
      state.paused = store.get().quests;
      snd.init();
      requestLock(G);
    },
    showHelp: () => {
      primaryUp(G);
      state.paused = true;
      store.set({ welcome: "again" });
      exitLock();
    },
    setSpeed,
    toggleDrawer,
    setQuests,
    toggleSound: () => {
      snd.on = !snd.on;
      store.set({ sound: snd.on });
      if (!snd.on) snd.pourStop();
      else snd.init();
    },
    unlockAudio: () => snd.init(),
    answerMystery: (guess) => answerMystery(G, guess),
    setQuality: (q) => {
      setQuality(q);
      try {
        window.localStorage.setItem(QUALITY_KEY, q);
      } catch {
        // жеке терезе — таңдау есте сақталмайды
      }
    },
    touch: {
      joy: (x, y) => {
        G.joy.x = x;
        G.joy.y = y;
      },
      right: (down) => {
        snd.init();
        if (down) primaryDown(G);
        else primaryUp(G);
      },
      left: () => {
        snd.init();
        secondaryDown(G);
      },
      back: () => returnHome(G, !state.held && !!state.heldL),
    },
    dispose: () => {
      progress.dispose();
      cancelAnimationFrame(raf);
      if (debug.__lab === G) delete debug.__lab;
      G.timers.forEach((t) => clearTimeout(t));
      G.timers.clear();
      unbind();
      unbindTouch();
      ro.disconnect();
      setEngineEmitter(null);
      snd.dispose();
      if (document.pointerLockElement === canvas) document.exitPointerLock();
      disposeScene(scene);
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
