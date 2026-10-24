import { liquidColor, pH, transfer } from "@/features/chem-engine";
import type { Game } from "../core/context";
import { LAMP_LIGHT } from "../core/renderer";
import { setCR, V3 } from "../core/three-utils";
import { addLog, nearPlayer, toast } from "../game/journal";
import { penalty } from "../interaction/actions";
import type { LabVessel } from "../items/types";
import { burReading } from "../scene/burette";

/** Бюретканың ұшының астында тұрған ыдыс (қолдағылар есептелмейді) */
function vesselUnder(G: Game, x: number, z: number, y: number): LabVessel | null {
  for (const o of G.vessels) {
    const it = o.it;
    if (it === G.state.held || it === G.state.heldL || !it.rest) continue;
    const p = it.rest.pos;
    if (p.y < y && Math.hypot(p.x - x, p.z - z) < o.r * 0.85) return o;
  }
  return null;
}

/**
 * Әр кадр: бюреткадағы сұйықтың деңгейі; кран ашық болса — тамшылап (0,12 мл/с) не ағынмен (1,5 мл/с) ағады.
 * Фенолфталеині бар ерітінді pH 8,2-ден өткенде — эквивалент нүктесі. Соңында спиртовка жалынының түсі.
 */
export function burStep(G: Game, rdt: number): void {
  const { bur, state, tr, fmt } = G;
  const v = bur.v;
  const H = Math.max(0, Math.min(1, v.V / 50)) * 0.4;
  bur.liq.visible = H > 0.001;
  if (bur.liq.visible) {
    bur.liq.scale.y = H;
    bur.liq.position.y = 0.05 + H / 2;
    const c = liquidColor(v);
    setCR(bur.liq.material.color, c.r, c.g, c.b);
    bur.liq.material.opacity = Math.max(0.3, Math.min(0.9, c.a + 0.15));
  }
  const tip = bur.g.localToWorld(V3(0, 0, 0));
  let streamOn = false;
  if (bur.stop > 0 && v.V > 0.001) {
    const rate = bur.stop === 1 ? 0.12 : 1.5;
    let amt = Math.min(v.V, rate * rdt * Math.min(4, state.speed));
    const o = vesselUnder(G, tip.x, tip.z, tip.y);
    if (o) {
      if (o.s.V + amt > o.cap) {
        amt = Math.max(0, o.cap - o.s.V);
        if (amt <= 0) {
          toast(G, tr("toast.vesselFullNamed", { name: o.s.name }), true);
          bur.stop = 0;
          bur.handle.rotation.z = 0;
        }
      }
      if (amt > 0) {
        const p0 = pH(o.s);
        transfer(v, o.s, amt);
        const p1 = pH(o.s);
        if ((o.s.ind.php || 0) > 0 && p0 != null && p1 != null && p0 < 8.2 && p1 >= 8.2 && bur.readStart != null) {
          G.stats.titr = true;
          const r = burReading(bur);
          addLog(G, "q", o.s.name, "", tr("log.equivalence", { r: fmt(r, 2), d: fmt(r - bur.readStart, 2) }));
          toast(G, tr("toast.equivalence"));
          G.snd.ding();
        }
      }
    } else {
      // Астында ыдыс жоқ — ерітінді үстелге төгіледі
      v.V = Math.max(0, v.V - amt);
      if (v.V < 0.01) v.ions = {};
      if (!bur.spillWarned) {
        bur.spillWarned = true;
        penalty(G, tr("penalty.spill"));
      }
    }
    const level = (vo: LabVessel) => vo.it.rest!.pos.y + 0.002 + (vo.s.V / vo.cap) * vo.h * 0.92;
    if (bur.stop === 2 && amt > 0) {
      streamOn = true;
      const ly = o ? level(o) : G.bench.top + 0.012;
      const len = Math.max(0.005, tip.y - ly);
      bur.stream.position.set(tip.x, tip.y - len / 2, tip.z);
      bur.stream.scale.set(1, len, 1);
      const c = liquidColor(v);
      setCR(bur.stream.material.color, c.r, c.g, c.b);
      if (Math.random() < rdt * 10 && nearPlayer(G, bur.g)) G.snd.drip();
    } else if (bur.stop === 1 && amt > 0) {
      bur.dripT -= rdt;
      if (bur.dripT <= 0) {
        bur.dripT = 0.42;
        const dm = bur.drops.find((m) => !m.visible);
        if (dm) {
          dm.position.copy(tip);
          dm.userData.vy = 0;
          dm.userData.to = o ? level(o) : G.bench.top + 0.012;
          dm.visible = true;
          const c = liquidColor(v);
          setCR(dm.material.color, c.r, c.g, c.b);
        }
        if (nearPlayer(G, bur.g)) G.snd.drip();
      }
    }
  }
  bur.stream.visible = streamOn;
  for (const dm of bur.drops) {
    if (!dm.visible) continue;
    dm.userData.vy += 9.8 * rdt * 0.35;
    dm.position.y -= dm.userData.vy * rdt;
    if (dm.position.y <= dm.userData.to) dm.visible = false;
  }

  // Спиртовка жалыны: жалын сынағында бірнеше секунд катионның түсіне боялады
  const { lamp } = G;
  if (lamp.lit) {
    lamp.showT = Math.max(0, lamp.showT - rdt);
    const tgt = lamp.showT > 0 ? lamp.target : [150, 190, 255];
    lamp.col = lamp.col.map((c, i) => c + (tgt[i] - c) * Math.min(1, rdt * 6)) as [number, number, number];
    setCR(lamp.outer.color, ...lamp.col);
    lamp.outer.opacity = lamp.showT > 0 ? 0.85 : 0.5;
    lamp.f1.scale.set(1, 0.9 + Math.random() * 0.2 + (lamp.showT > 0 ? 0.4 : 0), 1);
    setCR(lamp.light.color, ...lamp.col);
    lamp.light.intensity = ((lamp.showT > 0 ? 0.9 : 0.35) + Math.random() * 0.1) * LAMP_LIGHT;
  }
}
