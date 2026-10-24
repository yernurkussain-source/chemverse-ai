import * as THREE from "three";
import { ION, LIQUIDS, newVessel, REAG_BY, type IonId, type Vessel } from "@/features/chem-engine";
import { later, type Game, type PourState } from "../core/context";
import { setRaw, UP, V3 } from "../core/three-utils";
import { reagentNote, reagentShort } from "../game/i18n";
import { addLog, toast } from "../game/journal";
import type { HandView } from "../game/store";
import { pieceMesh } from "../items/materials";
import type { BuretteTarget, FunnelItem, Item, PourTarget, Rack, VesselItem } from "../items/types";
import { layoutRig, placeRig } from "../player/hands";
import { burReading } from "../scene/burette";
import { linkA, linkB, unlink } from "../systems/dtube";
import { wireDip, wireFlame } from "../systems/flame";
import { lampSet, splintSet, splintTest } from "../systems/splint";
import { decide, decideL, nm } from "./decide";

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

/** Қолдағы заттар карточкасының мазмұны (екі қол да бос болса — null) */
export function handView(G: Game): HandView | null {
  const R = G.state.held;
  const L = G.state.heldL;
  if (!R && !L) return null;
  const note = R && (R.type === "bottle" || R.type === "dropper" || R.type === "jar") ? reagentNote(G.tr, R.rid) : null;
  return { right: handTxt(G, R), left: handTxt(G, L), note };
}

/** Қолдағы заттар карточкасын жаңарту */
export function renderHand(G: Game): void {
  G.store.set({ hand: handView(G) });
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
  G.snd.clink(it.type === "vessel" || it.type === "funnel");
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
  G.snd.clink(it.type !== "bottle");
  return true;
}

/** Q / Z: затты бастапқы орнына қайтару (пробирка — штативтегі бос орынға; шырпы — жаңасы) */
export function returnHome(G: Game, left: boolean): void {
  const it = left ? G.state.heldL : G.state.held;
  if (!it || !it.home) return;
  if (it.type === "dtube" && it.A) unlink(G);
  if (it.type === "splint") {
    splintSet(it, "unlit");
    it.life = 70;
    addLog(G, "", G.tr("log.splint"), "", G.tr("log.newSplint"));
  }
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

// ---------- қауіпсіздік ----------

/** Қауіпсіздік ұпайынан −10 */
export function penalty(G: Game, why: string): void {
  const { state, tr } = G;
  state.safety = Math.max(0, state.safety - 10);
  G.store.set({ safety: state.safety });
  addLog(G, "w", tr("log.safety"), "", tr("log.penalty", { why }));
  toast(G, tr("toast.penalty", { why }), true);
  G.snd.buzz();
  G.progress.changed();
}

/** Отпен не қауіпті реактивпен көзілдіріксіз / қолғапсыз жұмыс — айып (әр затқа бір рет) */
export function safetyCheck(G: Game): void {
  const { state, tr } = G;
  const it = state.held;
  if (!it) return;
  if (it.type === "splint") {
    if (!state.warned.fire) {
      state.warned.fire = true;
      if (!state.goggles) penalty(G, tr("penalty.fire"));
    }
    return;
  }
  if (it.type !== "bottle" && it.type !== "dropper" && it.type !== "jar") return;
  const r = REAG_BY[it.rid];
  const haz = r.kind === "liq" ? LIQUIDS[r.id].haz : undefined;
  if (!haz || state.warned[r.id]) return;
  state.warned[r.id] = true;
  const f = reagentShort(tr, r.id);
  if (!state.goggles) penalty(G, tr("penalty.noGoggles", { f }));
  else if (haz === "gl" && !state.gloves) penalty(G, tr("penalty.noGloves", { f }));
}

/** Көзілдірік не қолғапты кию (ілгіштен жоғалады, HUD-та белгі жанады) */
function wear(G: Game, kind: "goggles" | "gloves"): void {
  const { state, tr } = G;
  if (kind === "goggles") {
    state.goggles = true;
    G.ppe.goggles.visible = false;
    G.store.set({ goggles: true });
    addLog(G, "", tr("log.safety"), "", tr("log.goggles"));
  } else {
    state.gloves = true;
    G.ppe.gloves.visible = false;
    G.store.set({ gloves: true });
    addLog(G, "", tr("log.safety"), "", tr("log.gloves"));
    if (state.held) layoutRig(G, G.rigR, state.held, true);
    if (state.heldL) layoutRig(G, G.rigL, state.heldL, true);
  }
  toast(G, tr(kind === "goggles" ? "toast.wornGoggles" : "toast.wornGloves"));
  G.snd.clink(false);
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
  safetyCheck(G);
  state.pour = { target: t, intoLeft };
  state.pourAmt = 0;
  if (pourable(t)) state.pourStartT = rvOf(G, t).T;
  if (intoLeft) G.stats.twohand = true;
}

export function stopPour(G: Game): void {
  const { state, tr, fmt } = G;
  G.snd.pourStop();
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

/** Қысқа «құю» қалпы (тамшы, кесек, шырпы, сым): зат нысанаға еңкейіп, ms-тен кейін қайтады */
export function tempPour(G: Game, t: PourTarget, ms: number, extra: Partial<PourState> = {}): void {
  G.state.pour = { target: t, intoLeft: false, ...extra, dropOnly: true };
  later(
    G,
    () => {
      if (G.state.pour?.dropOnly) G.state.pour = null;
    },
    ms,
  );
}

/** Индикатор тамшысы (тамшы ыдысқа жеткенде қосылады) */
function doDrop(G: Game, t: VesselItem, intoLeft: boolean): void {
  if (t.v.s.V <= 0.05) {
    toast(G, G.tr("toast.pourFirst"));
    return;
  }
  if (G.cooldown > 0) return;
  G.cooldown = 0.7;
  const held = G.state.held;
  if (held?.type !== "dropper") return;
  const id = held.rid;
  tempPour(G, t, 800, { intoLeft });
  later(
    G,
    () => {
      if (G.state.held !== held) return;
      const drop = G.fx.drop;
      drop.position.copy(held.g.localToWorld(V3(0, -0.004, 0)));
      drop.visible = true;
      drop.userData.t = t;
      drop.userData.vy = 0;
      drop.userData.id = id;
    },
    320,
  );
}

/** Қатты кесекті ыдысқа салу (бір ыдыста ең көбі 4 кесек) */
function doSolid(G: Game, t: VesselItem, intoLeft: boolean): void {
  if (t.v.s.pieces.length + G.fx.falling.length >= 4) {
    toast(G, G.tr("toast.noSpace"));
    return;
  }
  if (G.cooldown > 0) return;
  G.cooldown = 0.8;
  safetyCheck(G);
  const held = G.state.held;
  if (held?.type !== "jar") return;
  const id = held.rid;
  tempPour(G, t, 900, { intoLeft });
  later(
    G,
    () => {
      const m = pieceMesh(id, t.v.kind === "tube" ? 0.45 : 1).obj;
      const p = new THREE.Vector3();
      t.g.getWorldPosition(p);
      m.position.set(p.x, p.y + t.H * 0.9, p.z);
      G.scene.add(m);
      G.fx.falling.push({ m, t, id, v: 0 });
    },
    350,
  );
}

function attachFunnel(G: Game, f: FunnelItem, t: VesselItem): void {
  f.on = t;
  t.v.funnel = f;
  f.rest = { pos: V3(0, 0, 0), quat: new THREE.Quaternion() };
  release(G, false);
  G.snd.clink(true);
  addLog(G, "", t.name, "", G.tr("log.funnelOn"));
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
  G.snd.clink(true);
}

/** Ыдысты қалдыққа төгіп жуу (ыстығын абайсыз төксе — айып); воронкада — сүзгі қағазды ауыстыру */
function wasteHeld(G: Game, left: boolean): void {
  const { tr } = G;
  const it = (left ? G.state.heldL : G.state.held)!;
  if (it.type === "funnel") {
    it.paper = {};
    it.fv = newVessel(tr("vessels.funnel"), 12, "funnel");
    setRaw(it.paperMat.color, 0xf7f7f2);
    addLog(G, "", it.fv.name, "", tr("log.newPaper"));
    toast(G, tr("toast.newPaper"));
    G.snd.clink(true);
    return;
  }
  if (it.type !== "vessel") return;
  const o = it.v;
  if (o.s.T > 60) penalty(G, tr("penalty.hotWaste"));
  Object.assign(o.s, newVessel(o.s.name, o.cap, o.kind));
  o.head = { H2: 0, CO2: 0, O2: 0 };
  o.pieceMeshes.forEach((m) => o.pieces.remove(m.obj));
  o.pieceMeshes = [];
  addLog(G, "", o.s.name, "", tr("log.waste"));
  toast(G, tr("toast.cleaned", { name: o.s.name }));
  G.snd.clink(true);
}

function heaterPlace(G: Game, left: boolean): void {
  if (G.vessels.some((o) => o.s.onHeater)) {
    toast(G, G.tr("toast.heaterBusy"), true);
    return;
  }
  const it = (left ? G.state.heldL : G.state.held) as VesselItem;
  if (placeItem(G, left, V3(G.hp.x, G.hp.top, G.hp.z))) {
    it.v.s.onHeater = true;
    if (!left) addLog(G, "", it.name, "", G.tr("log.onHeater"));
  }
}

// ---------- басу ----------

/** Оң қол: E не тышқанның сол батырмасы */
export function primaryDown(G: Game): void {
  const { state, tr, fmt, bur } = G;
  if (!state.started || state.paused) return;
  const d = decide(G);
  if (!d || !d.act) {
    if (d?.text) toast(G, d.text, true);
    return;
  }
  const held = state.held;
  switch (d.act) {
    case "door": {
      const door = G.aimRes!.u.door!;
      door.open = !door.open;
      G.snd.door();
      break;
    }
    case "knob":
      state.heaterOn = !state.heaterOn;
      G.snd.click();
      addLog(G, "", tr("log.heater"), "", tr(state.heaterOn ? "log.heaterOn" : "log.heaterOff"));
      break;
    case "pick":
      pick(G, d.item!, false);
      break;
    case "ppe":
      wear(G, d.kind!);
      break;
    case "place":
      placeItem(G, false, G.aimRes!.h.point.clone());
      break;
    case "heaterPlace":
      heaterPlace(G, false);
      break;
    case "rackPlace":
      rackPlace(G, d.rack!, false);
      break;
    case "waste":
      wasteHeld(G, false);
      break;
    case "pour":
      startPour(G, d.target!, d.intoLeft);
      break;
    case "drop":
      doDrop(G, d.target as VesselItem, !!d.intoLeft);
      break;
    case "solid":
      doSolid(G, d.target as VesselItem, !!d.intoLeft);
      break;
    case "light":
      if (held?.type !== "splint") break;
      safetyCheck(G);
      splintSet(held, "burning");
      G.snd.whoosh();
      addLog(G, "", tr("log.splint"), "", tr("log.lit"));
      break;
    case "blow":
      if (held?.type !== "splint") break;
      splintSet(held, "smolder");
      G.snd.hiss();
      addLog(G, "", tr("log.splint"), "", tr("log.blown"));
      break;
    case "splintTest":
      splintTest(G, d.target as VesselItem);
      break;
    case "funnelOn":
      if (held?.type === "funnel") attachFunnel(G, held, d.target as VesselItem);
      break;
    case "dtubeA":
      if (held?.type === "dtube") linkA(G, held, d.target as VesselItem);
      break;
    case "dtubeB":
      if (held?.type === "dtube") linkB(G, held, d.target as VesselItem);
      break;
    case "stopcock": {
      const prev = bur.stop;
      bur.stop = (bur.stop + 1) % 3;
      G.snd.click();
      bur.handle.rotation.z = bur.stop === 0 ? 0 : bur.stop === 1 ? 0.5 : Math.PI / 2;
      if (prev === 0) {
        bur.readStart = burReading(bur);
        bur.spillWarned = false;
        addLog(G, "", bur.target.name, "", tr("log.cockOpen", { r: fmt(bur.readStart, 2) }));
      }
      if (bur.stop === 0 && bur.readStart != null) {
        const r = burReading(bur);
        addLog(G, "r", bur.target.name, "", tr("log.cockClosed", { r: fmt(r, 2), d: fmt(r - bur.readStart, 2) }));
        bur.readStart = null;
      }
      break;
    }
    case "burEmpty":
      bur.v = newVessel(bur.target.name, 50, "burette");
      bur.stop = 0;
      bur.handle.rotation.z = 0;
      addLog(G, "", bur.target.name, "", tr("log.burEmptied"));
      G.snd.drip();
      break;
    case "lampOn":
      safetyCheck(G);
      lampSet(G, true);
      G.snd.whoosh();
      G.stats.lamp = true;
      addLog(G, "", tr("log.lamp"), "", tr("log.lampOn"));
      break;
    case "lampOff":
      lampSet(G, false);
      G.snd.clink(true);
      addLog(G, "", tr("log.lamp"), "", tr("log.lampOff"));
      break;
    case "wireDip": {
      if (G.cooldown > 0 || held?.type !== "wire") return;
      G.cooldown = 0.8;
      const t = d.target as VesselItem;
      tempPour(G, t, 850, { dip: true });
      later(G, () => state.held === held && wireDip(G, held, t), 380);
      break;
    }
    case "wireFlame":
      if (G.cooldown > 0 || held?.type !== "wire") return;
      G.cooldown = 1.2;
      tempPour(G, G.lamp.anchor, 1500, { flame: true });
      later(G, () => state.held === held && wireFlame(G, held), 420);
      break;
    case "dtubeOff": {
      const A = G.dtube.A;
      unlink(G);
      G.dtube.g.position.copy(G.camera.position);
      pick(G, G.dtube, false);
      addLog(G, "", A ? A.name : "", "", tr("log.unlinked"));
      break;
    }
  }
}

/** Сол қол: F не тышқанның оң батырмасы */
export function secondaryDown(G: Game): void {
  const { state } = G;
  if (!state.started || state.paused) return;
  const d = decideL(G);
  if (!d || !d.act) {
    if (state.heldL) toast(G, G.tr("toast.leftHint"), true);
    return;
  }
  switch (d.act) {
    case "pickL":
      pick(G, d.item!, true);
      break;
    case "placeL":
      placeItem(G, true, G.aimRes!.h.point.clone());
      break;
    case "rackPlaceL":
      rackPlace(G, d.rack!, true);
      break;
    case "wasteL":
      wasteHeld(G, true);
      break;
    case "heaterPlaceL":
      heaterPlace(G, true);
      break;
  }
}

export function primaryUp(G: Game): void {
  if (G.state.pour && !G.state.pour.dropOnly) stopPour(G);
}
