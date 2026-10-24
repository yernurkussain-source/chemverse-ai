import * as THREE from "three";
import type { Game } from "../core/context";
import { V3 } from "../core/three-utils";
import { addLog, toast } from "../game/journal";
import { renderHand } from "../interaction/actions";
import { tagOf, type DTubeItem, type VesselItem } from "../items/types";

/** Түтік қайта салынуы керек пе (ыдыстардың орны өзгерсе) */
function linkKey(A: VesselItem, B: VesselItem): string {
  const a = A.g.position;
  const b = B.g.position;
  return [a.x, a.y, a.z, b.x, b.y, b.z].map((x) => x.toFixed(3)).join(",");
}

/** A-ның аузынан B ыдысына (не қолдағы ұшына) дейін иілген шыны түтік */
function buildDyn(G: Game, A: VesselItem, B: VesselItem | null, handPos?: THREE.Vector3): void {
  removeDyn(G);
  const a = new THREE.Vector3();
  A.g.getWorldPosition(a);
  a.y += A.H + 0.01;
  let b: THREE.Vector3;
  if (handPos) b = handPos.clone();
  else {
    b = new THREE.Vector3();
    B!.g.getWorldPosition(b);
    b.y += Math.max(0.02, B!.H * 0.2);
  }
  const topY = Math.max(a.y, b.y + (handPos ? 0 : B!.H * 0.8)) + 0.07;
  const pts = [
    a.clone(),
    V3(a.x, topY - 0.02, a.z),
    V3(a.x + (b.x - a.x) * 0.2, topY, a.z + (b.z - a.z) * 0.2),
    V3(a.x + (b.x - a.x) * 0.8, topY, a.z + (b.z - a.z) * 0.8),
    V3(b.x, topY - 0.02, b.z),
    b,
  ];
  const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.0025, 8, false), G.mats.glassTube);
  m.renderOrder = 4;
  tagOf(m).dt = true;
  G.scene.add(m);
  G.fx.dyn.mesh = m;
  // Жалғанған түтікке қарап, оны ажыратуға болады
  if (!handPos) G.interactive.push(m);
}

function removeDyn(G: Game): void {
  const dyn = G.fx.dyn;
  if (dyn.mesh) {
    const i = G.interactive.indexOf(dyn.mesh);
    if (i >= 0) G.interactive.splice(i, 1);
    G.scene.remove(dyn.mesh);
    dyn.mesh.geometry.dispose();
    dyn.mesh = null;
  }
  dyn.key = "";
}

/** Тығынды A пробиркасына кигізу (газ осыдан шығады), түтік қолда қалады */
export function linkA(G: Game, d: DTubeItem, t: VesselItem): void {
  d.A = t;
  t.v.stopper.visible = true;
  t.v.link = { A: t, B: null };
  G.snd.clink(false);
  addLog(G, "", t.name, "", G.tr("log.stopper"));
}

/** Түтіктің екінші ұшын B ыдысына салу (ыдыстар 0,5 м-ден алыс болмауы керек) */
export function linkB(G: Game, d: DTubeItem, t: VesselItem): void {
  const A = d.A!;
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  A.g.getWorldPosition(pa);
  t.g.getWorldPosition(pb);
  if (Math.hypot(pa.x - pb.x, pa.z - pb.z) > 0.5) {
    toast(G, G.tr("toast.tooFar"), true);
    return;
  }
  d.B = t;
  A.v.link = { A, B: t };
  t.v.linkIn = A;
  d.g.visible = false;
  d.rest = null;
  G.state.held = null;
  renderHand(G);
  G.fx.dyn.key = "";
  G.snd.clink(true);
  addLog(G, "", `${A.name} → ${t.name}`, "", G.tr("log.linked", { a: A.name, b: t.name }));
}

export function unlink(G: Game): void {
  const d = G.dtube;
  if (!d.A) return;
  const A = d.A;
  const B = d.B;
  A.v.link = null;
  A.v.stopper.visible = false;
  if (B) B.v.linkIn = null;
  d.A = null;
  d.B = null;
  removeDyn(G);
  d.g.visible = true;
}

/** Әр кадр: жалғанған түтік ыдыстармен бірге қозғалады; қолдағы ұшы қолға ереді */
export function updateDtube(G: Game): void {
  const { dtube, fx } = G;
  if (dtube.A && dtube.B) {
    const key = linkKey(dtube.A, dtube.B);
    if (key !== fx.dyn.key) {
      buildDyn(G, dtube.A, dtube.B);
      fx.dyn.key = key;
    }
  } else if (dtube.A && G.state.held === dtube) buildDyn(G, dtube.A, null, dtube.g.localToWorld(V3(0, 0.05, 0)));
  else if (fx.dyn.mesh) removeDyn(G);
}
