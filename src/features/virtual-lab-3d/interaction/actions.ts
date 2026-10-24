import * as THREE from "three";
import { ION, newVessel, type IonId, type Vessel } from "@/features/chem-engine";
import type { Game } from "../core/context";
import { setRaw, UP, V3 } from "../core/three-utils";
import { reagentNote } from "../game/i18n";
import { addLog, toast } from "../game/journal";
import type { BuretteTarget, FunnelItem, Item, PourTarget, Rack, VesselItem } from "../items/types";
import { layoutRig, placeRig } from "../player/hands";
import { decide, nm } from "./decide";

// ---------- қолдағы зат ----------

function handTxt(G: Game, it: Item | null): string {
  const { tr } = G;
  if (!it) return "—";
  if (it.type === "splint") return `${it.name} (${tr(`splintState.${it.st}`)})`;
  if (it.type === "wire") {
    const ions = Object.keys(it.sample);
    if (ions.length) return `${it.name} (${tr("hand.wireSample", { ions: ions.map((k) => ION[k as IonId].f).join(", ") })})`;
    return it.acid ? `${it.name} (${tr("hand.wireAcid")})` : it.name;
  }
  if (it.type === "vessel" || it.type === "funnel" || it.type === "dtube") return it.name;
  return `${it.name} · ${it.full}`;
}

/** Қолдағы заттар карточкасын жаңарту */
export function renderHand(G: Game): void {
  const R = G.state.held;
  const L = G.state.heldL;
  if (!R && !L) G.store.set({ hand: null });
  else {
    const note = R && (R.type === "bottle" || R.type === "dropper" || R.type === "jar") ? reagentNote(G.tr, R.rid) : null;
    G.store.set({ hand: { right: handTxt(G, R), left: handTxt(G, L), note } });
  }
  placeRig(G, G.rigR, null);
  placeRig(G, G.rigL, null);
}

function detachFromWorld(it: Item): void {
  if (it.slot) {
    it.slot.item = null;
    it.slot = null;
  }
  if (it.type === "vessel" && it.v.s.onHeater) it.v.s.onHeater = false;
  if (it.type === "funnel" && it.on) {
    it.on.v.funnel = null;
    it.on = null;
  }
}

export function pick(G: Game, it: Item, left: boolean): void {
  detachFromWorld(it);
  if (left) G.state.heldL = it;
  else G.state.held = it;
  layoutRig(G, left ? G.rigL : G.rigR, it, G.state.gloves);
  if (it.cap) it.cap.visible = false;
  if (!left) G.state.warned = {};
  renderHand(G);
}

export function release(G: Game, left: boolean): void {
  const it = left ? G.state.heldL : G.state.held;
  if (!it) return;
  if (it.cap) it.cap.visible = true;
  if (left) G.state.heldL = null;
  else {
    // Журналға «не құйылды» деп жазу үшін алдымен құюды аяқтаймыз, сосын қолды босатамыз
    stopPour(G);
    G.state.held = null;
  }
  renderHand(G);
}

/** Орын бос па: сол биіктікте басқа зат жақын тұрмауы керек */
function clearAt(G: Game, pos: THREE.Vector3, it: Item): boolean {
  for (const o of G.items) {
    if (o === it || !o.rest || o === G.state.held || o === G.state.heldL) continue;
    const dy = Math.abs(o.rest.pos.y - pos.y);
    const dd = Math.hypot(o.rest.pos.x - pos.x, o.rest.pos.z - pos.z);
    if (dy < 0.05 && dd < o.R + it.R + 0.004) return false;
  }
  return true;
}

export function placeItem(G: Game, left: boolean, pos: THREE.Vector3): boolean {
  const it = (left ? G.state.heldL : G.state.held)!;
  const { bur, bench } = G;
  // Бюретканың табанына қойылған ыдыс дәл оның астына келеді
  if (it.type === "vessel" && Math.abs(pos.y - (bench.top + 0.012)) < 0.01 && Math.hypot(pos.x - bur.x, pos.z - bur.z) < 0.09) {
    pos = V3(bur.x, pos.y, bur.z);
  }
  if (!clearAt(G, pos, it)) {
    toast(G, G.tr("toast.noRoom"), true);
    return false;
  }
  const yaw = Math.atan2(G.player.x - pos.x, G.player.z - pos.z);
  let q = new THREE.Quaternion().setFromAxisAngle(UP, yaw);
  if (it.type === "splint") {
    q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, Math.PI / 2));
    pos = pos.clone();
    pos.y += 0.003;
  }
  it.rest = { pos: pos.clone(), quat: q };
  release(G, left);
  return true;
}

/** Q / Z: затты бастапқы орнына қайтару (пробирка — штативтегі бос орынға) */
export function returnHome(G: Game, left: boolean): void {
  const it = left ? G.state.heldL : G.state.held;
  if (!it || !it.home) return;
  if (it.home.slot) {
    let sl: Item["slot"] | undefined = it.home.slot;
    if (sl.item && sl.item !== it) sl = G.rackCab.slots.find((s) => !s.item);
    if (sl) {
      it.rest = { pos: sl.pos.clone(), quat: new THREE.Quaternion() };
      sl.item = it;
      it.slot = sl;
      release(G, left);
      return;
    }
  }
  it.rest = { pos: it.home.pos.clone(), quat: it.home.quat.clone() };
  release(G, left);
}

// ---------- құю ----------

/** Құйғанда ерітінді қай ыдысқа түседі (воронкада — астындағы ыдыс, бюреткада — бюретка) */
export function rvOf(G: Game, t: VesselItem | FunnelItem | BuretteTarget): Vessel {
  if (t.type === "funnel") return t.on!.v.s;
  if (t.type === "burette") return G.bur.v;
  return t.v.s;
}

const pourable = (t: PourTarget): t is VesselItem | FunnelItem | BuretteTarget => t.type !== "lamp";

export function startPour(G: Game, t: PourTarget, intoLeft = false): void {
  const { state } = G;
  state.pour = { target: t, intoLeft };
  state.pourAmt = 0;
  if (pourable(t)) state.pourStartT = rvOf(G, t).T;
  if (intoLeft) G.stats.twohand = true;
}

export function stopPour(G: Game): void {
  const { state, tr, fmt } = G;
  const p = state.pour;
  if (p && !p.dropOnly && !p.test && pourable(p.target)) {
    const t = p.target;
    const rv = rvOf(G, t);
    const amt = state.pourAmt;
    if (amt > 0.05) {
      const who = t.type === "funnel" ? tr("log.funnelTo", { name: t.on!.name }) : t.type === "burette" ? t.name : rv.name;
      const held = state.held;
      const text =
        held?.type === "vessel"
          ? tr("log.pouredVessel", { name: held.name, amount: fmt(amt) })
          : tr("log.pouredReagent", { f: held ? nm(G, held) : "—", amount: fmt(amt) });
      addLog(G, "", who, "", text);
    }
    const dT = rv.T - state.pourStartT;
    if (Math.abs(dT) >= 0.5 && t.type !== "funnel" && t.type !== "burette") {
      addLog(G, "", rv.name, "", tr("log.temp", { from: fmt(state.pourStartT), to: fmt(rv.T), delta: (dT > 0 ? "+" : "") + fmt(dT) }));
    }
  }
  state.pour = null;
  state.pourAmt = 0;
}

// ---------- қою, төгу ----------

function rackPlace(G: Game, rk: Rack, left: boolean): void {
  const hp = G.aimRes!.h.point;
  let best: Rack["slots"][number] | null = null;
  let bd = 1;
  for (const s of rk.slots) {
    if (s.item) continue;
    const dd = Math.hypot(s.pos.x - hp.x, s.pos.z - hp.z);
    if (dd < bd) {
      bd = dd;
      best = s;
    }
  }
  if (!best) {
    toast(G, G.tr("toast.rackFull"), true);
    return;
  }
  const it = (left ? G.state.heldL : G.state.held)!;
  it.rest = { pos: best.pos.clone(), quat: new THREE.Quaternion() };
  best.item = it;
  it.slot = best;
  release(G, left);
}

/** Ыдысты қалдыққа төгіп жуу; воронкада — сүзгі қағазды ауыстыру */
function wasteHeld(G: Game, left: boolean): void {
  const { tr } = G;
  const it = (left ? G.state.heldL : G.state.held)!;
  if (it.type === "funnel") {
    it.paper = {};
    it.fv = newVessel(tr("vessels.funnel"), 12, "funnel");
    setRaw(it.paperMat.color, 0xf7f7f2);
    addLog(G, "", it.fv.name, "", tr("log.newPaper"));
    toast(G, tr("toast.newPaper"));
    return;
  }
  if (it.type !== "vessel") return;
  const o = it.v;
  Object.assign(o.s, newVessel(o.s.name, o.cap, o.kind));
  o.head = { H2: 0, CO2: 0, O2: 0 };
  o.pieceMeshes.forEach((m) => o.pieces.remove(m.obj));
  o.pieceMeshes = [];
  addLog(G, "", o.s.name, "", tr("log.waste"));
  toast(G, tr("toast.cleaned", { name: o.s.name }));
}

// ---------- басу ----------

/** Оң қол: E не тышқанның сол батырмасы */
export function primaryDown(G: Game): void {
  const { state, tr } = G;
  if (!state.started || state.paused) return;
  const d = decide(G);
  if (!d || !d.act) {
    if (d?.text) toast(G, d.text, true);
    return;
  }
  switch (d.act) {
    case "door": {
      const door = G.aimRes!.u.door!;
      door.open = !door.open;
      break;
    }
    case "knob":
      state.heaterOn = !state.heaterOn;
      addLog(G, "", tr("log.heater"), "", tr(state.heaterOn ? "log.heaterOn" : "log.heaterOff"));
      break;
    case "pick":
      pick(G, d.item!, false);
      break;
    case "place":
      placeItem(G, false, G.aimRes!.h.point.clone());
      break;
    case "heaterPlace": {
      if (G.vessels.some((o) => o.s.onHeater)) {
        toast(G, tr("toast.heaterBusy"), true);
        return;
      }
      const it = state.held as VesselItem;
      if (placeItem(G, false, V3(G.hp.x, G.hp.top, G.hp.z))) {
        it.v.s.onHeater = true;
        addLog(G, "", it.name, "", tr("log.onHeater"));
      }
      break;
    }
    case "rackPlace":
      rackPlace(G, d.rack!, false);
      break;
    case "waste":
      wasteHeld(G, false);
      break;
    case "pour":
      startPour(G, d.target!, d.intoLeft);
      break;
  }
}

export function primaryUp(G: Game): void {
  if (G.state.pour && !G.state.pour.dropOnly) stopPour(G);
}
