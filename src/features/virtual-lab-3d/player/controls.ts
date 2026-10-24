import { ROOM, type Game } from "../core/context";
import { decide } from "../interaction/decide";

/** Басу өңдеушілері (ойын модулі береді) */
export type InputHandlers = {
  primaryDown: () => void;
  primaryUp: () => void;
  secondaryDown: () => void;
  returnHome: (left: boolean) => void;
  setSpeed: (speed: number) => void;
  toggleDrawer: () => void;
  openQuests: () => void;
  /** Esc: ашық терезені (тапсырмалар, журнал) жабу */
  closeOverlays: () => void;
};

/** Тышқанмен не саусақпен қарау: yaw — солға/оңға, pitch — жоғары/төмен (шектеулі) */
export function look(G: Game, dx: number, dy: number): void {
  const p = G.player;
  p.yaw -= dx * 0.0022;
  p.pitch = Math.max(-1.35, Math.min(1.2, p.pitch - dy * 0.0022));
}

/** Ойыншының денесі (радиусы 0,28 м) қабырғаға не жиһазға тиеді ме */
function blocked(G: Game, x: number, z: number): boolean {
  const r = 0.28;
  if (x < ROOM.x0 + r || x > ROOM.x1 - r || z < ROOM.z0 + r || z > ROOM.z1 - r) return true;
  for (const c of G.colliders) if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return true;
  return false;
}

/** WASD / бағыт пернелері (не джойстик) бойынша жүру; X пен Z бөлек тексеріледі — қабырға бойымен сырғиды */
export function movePlayer(G: Game, rdt: number): number {
  const { keys, joy, player, state } = G;
  let fx = 0;
  let fz = 0;
  if (keys.KeyW || keys.ArrowUp) fz += 1;
  if (keys.KeyS || keys.ArrowDown) fz -= 1;
  if (keys.KeyA || keys.ArrowLeft) fx -= 1;
  if (keys.KeyD || keys.ArrowRight) fx += 1;
  fx += joy.x;
  fz -= joy.y;
  const ml = Math.hypot(fx, fz);
  if (!(ml > 0.05 && state.started && !state.paused)) return 0;
  const sp = ((keys.ShiftLeft || keys.ShiftRight ? 2.8 : 1.6) * Math.min(1, ml)) / ml;
  const sy = Math.sin(player.yaw);
  const cy = Math.cos(player.yaw);
  const dx = (fx * cy - fz * sy) * sp * rdt;
  const dz = (-fx * sy - fz * cy) * sp * rdt;
  const x0 = player.x;
  const z0 = player.z;
  if (!blocked(G, player.x + dx, player.z)) player.x += dx;
  if (!blocked(G, player.x, player.z + dz)) player.z += dz;
  player.bob += rdt * 9 * Math.min(1, ml);
  return Math.hypot(player.x - x0, player.z - z0);
}

/** Тышқанды «ұстап алу» (pointer lock). Болмаса — тышқанды басып тұрып сүйреп қарайды */
export function requestLock(G: Game): void {
  if (G.isTouch) return;
  try {
    const p = G.canvas.requestPointerLock?.() as Promise<void> | undefined;
    if (p && typeof p.catch === "function") p.catch(() => (G.state.lockFailed = true));
  } catch {
    G.state.lockFailed = true;
  }
}

/**
 * Телефонда экранды саусақпен сүйреп қарау (бірнеше саусақ: бірі джойстикте, екіншісі экранда).
 * Джойстик пен батырмалар — hud/TouchControls.tsx. Қайтарады: тыңдаушыларды алып тастайтын функция.
 */
export function bindTouchLook(G: Game): () => void {
  const { canvas } = G;
  const looks = new Map<number, { x: number; y: number }>();
  const onDown = (e: PointerEvent) => {
    if (!G.isTouch) return;
    looks.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch {
      // саусақ экраннан кетіп қалған
    }
  };
  const onMove = (e: PointerEvent) => {
    const l = looks.get(e.pointerId);
    if (!l || !G.state.started || G.state.paused) return;
    const dx = e.clientX - l.x;
    const dy = e.clientY - l.y;
    l.x = e.clientX;
    l.y = e.clientY;
    look(G, dx * 1.5, dy * 1.5);
  };
  const onEnd = (e: PointerEvent) => {
    looks.delete(e.pointerId);
  };
  canvas.addEventListener("pointerdown", onDown);
  canvas.addEventListener("pointermove", onMove);
  canvas.addEventListener("pointerup", onEnd);
  canvas.addEventListener("pointercancel", onEnd);
  return () => {
    canvas.removeEventListener("pointerdown", onDown);
    canvas.removeEventListener("pointermove", onMove);
    canvas.removeEventListener("pointerup", onEnd);
    canvas.removeEventListener("pointercancel", onEnd);
  };
}

/** Компьютердегі басқару. Қайтарады: тыңдаушыларды алып тастайтын функция */
export function bindDesktop(G: Game, h: InputHandlers): () => void {
  const { canvas, state, keys } = G;
  const mouse = { down: false, x: 0, y: 0, moved: 0, pendingAct: false };
  const active = () => state.started && !state.paused;

  const onLockChange = () => {
    state.locked = document.pointerLockElement === canvas;
  };
  const onLockError = () => {
    state.lockFailed = true;
  };
  const onContext = (e: MouseEvent) => e.preventDefault();
  const onDown = (e: MouseEvent) => {
    if (G.isTouch || !active()) return;
    G.snd.init();
    if (e.button === 2) {
      h.secondaryDown();
      return;
    }
    if (e.button !== 0) return;
    if (state.locked) {
      h.primaryDown();
      mouse.down = true;
      return;
    }
    if (!state.lockFailed) requestLock(G);
    Object.assign(mouse, { down: true, x: e.clientX, y: e.clientY, moved: 0, pendingAct: true });
    // Құю — басып тұрған кезде жүреді, сондықтан бірден басталады
    const d = decide(G);
    if (d && d.act === "pour") {
      h.primaryDown();
      mouse.pendingAct = false;
    }
  };
  const onMove = (e: MouseEvent) => {
    if (G.isTouch || !active()) return;
    if (state.locked) {
      look(G, e.movementX, e.movementY);
      return;
    }
    if (mouse.down) {
      const dx = e.clientX - mouse.x;
      const dy = e.clientY - mouse.y;
      mouse.moved += Math.abs(dx) + Math.abs(dy);
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (mouse.moved > 6 && !state.pour) look(G, dx, dy);
    }
  };
  const onUp = (e: MouseEvent) => {
    if (G.isTouch || e.button !== 0 || !mouse.down) return;
    mouse.down = false;
    if (state.locked) {
      h.primaryUp();
      return;
    }
    // Сүйремей басылса — бұл «шерту»: әрекет орындалады
    if (mouse.pendingAct && mouse.moved <= 6) h.primaryDown();
    h.primaryUp();
    mouse.pendingAct = false;
  };
  const onKeyDown = (e: KeyboardEvent) => {
    keys[e.code] = true;
    if (e.code === "Escape") h.closeOverlays();
    if (!active()) return;
    G.snd.init();
    if (e.code === "KeyE" && !e.repeat) h.primaryDown();
    if (e.code === "KeyF" && !e.repeat) h.secondaryDown();
    if (e.code === "KeyQ") h.returnHome(false);
    if (e.code === "KeyZ") h.returnHome(true);
    if (e.code === "KeyJ") h.toggleDrawer();
    if (e.code === "KeyT") h.openQuests();
    if (e.code === "Digit1") h.setSpeed(1);
    if (e.code === "Digit2") h.setSpeed(5);
    if (e.code === "Digit3") h.setSpeed(20);
    if (["Space", "ArrowUp", "ArrowDown"].includes(e.code)) e.preventDefault();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    keys[e.code] = false;
    if (e.code === "KeyE") h.primaryUp();
  };
  const onBlur = () => {
    for (const k in keys) keys[k] = false;
    h.primaryUp();
  };

  document.addEventListener("pointerlockchange", onLockChange);
  document.addEventListener("pointerlockerror", onLockError);
  canvas.addEventListener("contextmenu", onContext);
  canvas.addEventListener("mousedown", onDown);
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", onBlur);
  return () => {
    document.removeEventListener("pointerlockchange", onLockChange);
    document.removeEventListener("pointerlockerror", onLockError);
    canvas.removeEventListener("contextmenu", onContext);
    canvas.removeEventListener("mousedown", onDown);
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", onBlur);
  };
}
