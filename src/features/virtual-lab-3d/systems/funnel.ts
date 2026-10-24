import * as THREE from "three";
import { entries, liquidColor, PPT, transfer } from "@/features/chem-engine";
import type { Game } from "../core/context";
import { CR, setCR, V3 } from "../core/three-utils";
import { nearPlayer } from "../game/journal";

const PAPER = CR(247, 247, 242);
const tmpCol = new THREE.Color();
const tmpPos = new THREE.Vector3();

/**
 * Воронка мен сүзу (әр кадр): воронкадағы сұйықтың деңгейі мен түсі, сүзгі қағаздың тұнбадан боялуы,
 * сұйықтың ыдысқа тамшылап өтуі (ауырлық күшімен, уақыт жылдамдығы ×4-тен аспайды). Тұнба қағазда қалады.
 */
export function updateFunnel(G: Game, rdt: number): void {
  const f = G.funnel;
  const fl = f.fv.V;
  f.fliq.visible = fl > 0.05;
  if (f.fliq.visible) {
    const sc = Math.max(0.25, Math.cbrt(Math.min(1, fl / f.fv.cap)));
    f.fliq.scale.setScalar(sc);
    f.fliq.position.y = 0.05 + 0.016 * sc;
    const c = liquidColor(f.fv);
    setCR(f.fliq.material.color, c.r, c.g, c.b);
    f.fliq.material.opacity = Math.min(0.9, c.a + 0.2);
  }
  let ptot = 0;
  let pr = 0;
  let pg = 0;
  let pb = 0;
  for (const [k, n] of entries(f.paper)) {
    ptot += n;
    const c = PPT[k].col;
    pr += c[0] * n;
    pg += c[1] * n;
    pb += c[2] * n;
  }
  if (ptot > 1e-7) f.paperMat.color.copy(PAPER).lerp(setCR(tmpCol, pr / ptot, pg / ptot, pb / ptot), Math.min(1, ptot / 0.0015));

  if (f.on && fl > 0.01) {
    const rcv = f.on.v;
    let amt = Math.min(fl, 1.1 * rdt * Math.min(4, G.state.speed));
    if (rcv.s.V + amt > rcv.cap) amt = Math.max(0, rcv.cap - rcv.s.V);
    if (amt > 0) {
      const sum = () => Object.values(f.paper).reduce((a, b) => a + (b ?? 0), 0);
      const before = sum();
      transfer(f.fv, rcv.s, amt, f.paper);
      const after = sum();
      if (after > before + 1e-9 || after > 1e-6) G.stats.filter = G.stats.filter || (after > 1e-5 && rcv.s.V > 1);
      f.dripT -= rdt;
      if (f.dripT <= 0) {
        f.dripT = 0.28;
        const dm = G.fx.drips.find((m) => !m.visible);
        if (dm) {
          dm.position.copy(f.g.localToWorld(V3(0, 0, 0)));
          dm.userData.vy = 0;
          dm.userData.t = f.on;
          dm.visible = true;
          const c = liquidColor(rcv.s);
          setCR(dm.material.color, c.r, c.g, c.b);
        }
        if (nearPlayer(G, f.g)) G.snd.drip();
      }
    }
  }
  for (const dm of G.fx.drips) {
    if (!dm.visible) continue;
    dm.userData.vy += 9.8 * rdt * 0.3;
    dm.position.y -= dm.userData.vy * rdt;
    const t = dm.userData.t;
    if (!t) {
      dm.visible = false;
      continue;
    }
    t.g.getWorldPosition(tmpPos);
    if (dm.position.y <= tmpPos.y + (t.v.s.V / t.v.cap) * t.H * 0.92 + 0.002) dm.visible = false;
  }
}
