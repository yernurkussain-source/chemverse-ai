import * as THREE from "three";
import { addLiquid, LIQUIDS, liquidColor, transfer } from "@/features/chem-engine";
import type { Game } from "../core/context";
import { setCR, setRaw, UP, V3 } from "../core/three-utils";
import { toast } from "../game/journal";
import { stopPour } from "../interaction/actions";
import { REAG_LIQ_COL } from "../items/materials";
import { placeRig } from "../player/hands";
import { holdPose, pourPose } from "./pour";

/**
 * Әр кадр: заттарды орнына жылжыту (қолда, құйғанда, сөреде), қолдың модельі,
 * басып тұрып құю (еңкейту бұрышы 1 рад-тан асқанда ағады), есіктер, плитканың қызуы.
 */
export function updateObjects(G: Game, rdt: number): void {
  const { state } = G;
  const k = 1 - Math.exp(-rdt * 12);
  for (const it of G.items) {
    if (it === state.held) {
      const p = state.pour?.target ? pourPose(G, it, state.pour.target) : holdPose(G, it, false);
      it.g.position.lerp(p.pos, k);
      it.g.quaternion.slerp(p.quat, k);
    } else if (it === state.heldL) {
      const p = holdPose(G, it, true);
      it.g.position.lerp(p.pos, k);
      it.g.quaternion.slerp(p.quat, k);
    } else if (it.type === "funnel" && it.on) {
      const p = new THREE.Vector3();
      it.on.g.getWorldPosition(p);
      p.y += it.on.H - 0.032;
      it.g.position.lerp(p, k);
      it.g.quaternion.slerp(it.on.g.quaternion, k);
    } else if (it.rest) {
      it.g.position.lerp(it.rest.pos, k);
      it.g.quaternion.slerp(it.rest.quat, k);
    }
  }
  placeRig(G, G.rigR, state.held);
  placeRig(G, G.rigL, state.heldL);

  // Құю
  const it = state.held;
  const { stream } = G.fx;
  let flowing = false;
  if (it && state.pour && !state.pour.dropOnly && state.pour.target.type !== "lamp") {
    const tilt = UP.clone().applyQuaternion(it.g.quaternion).angleTo(UP);
    if (tilt > 1.0) {
      const t = state.pour.target;
      const isB = t.type === "burette";
      const isF = t.type === "funnel" || isB;
      const rv = t.type === "burette" ? G.bur.v : t.type === "funnel" ? t.fv : t.v.s;
      const cap = t.type === "burette" ? 50 : t.type === "funnel" ? t.fv.cap : t.v.cap;
      const rate = (isB ? 4 : isF ? 3 : t.type === "vessel" && t.v.kind === "tube" ? 2.5 : 6) * Math.min(1, (tilt - 1.0) / 0.5);
      let amt = rate * rdt;
      if (rv.V + amt > cap) {
        amt = Math.max(0, cap - rv.V);
        if (amt <= 0 && (!isF || isB)) {
          toast(G, G.tr(isB ? "toast.buretteFull" : "toast.vesselFull"), true);
          stopPour(G);
        }
      }
      if (amt > 0) {
        if (it.type === "bottle") {
          addLiquid(rv, LIQUIDS[it.rid].ions, amt);
          state.pourAmt += amt;
          flowing = true;
        } else if (it.type === "vessel") {
          const m = transfer(it.v.s, rv, amt);
          state.pourAmt += m;
          flowing = m > 0;
          if (it.v.s.V <= 0.05) {
            toast(G, G.tr("toast.emptied", { name: it.name }));
            stopPour(G);
          }
        }
      }
      if (flowing) {
        const a = it.g.localToWorld(V3(0, it.H, 0));
        const b = new THREE.Vector3();
        t.g.getWorldPosition(b);
        b.y += isB ? G.bur.H + 0.004 : isF ? 0.075 : 0.002 + Math.max(0.002, (rv.V / cap) * t.H * 0.92);
        const d = b.clone().sub(a);
        const len = d.length();
        stream.position.copy(a).addScaledVector(d, 0.5);
        stream.quaternion.setFromUnitVectors(UP, d.normalize());
        const thin = t.type === "vessel" && t.v.kind === "tube";
        stream.scale.set(thin ? 0.6 : 1, len, thin ? 0.6 : 1);
        if (it.type === "bottle") setCR(stream.material.color, ...(REAG_LIQ_COL[it.rid] || [205, 228, 242]));
        else if (it.type === "vessel") {
          const c = liquidColor(it.v.s);
          setCR(stream.material.color, c.r, c.g, c.b);
        }
      }
    }
  }
  stream.visible = flowing;

  // Есіктер баяу ашылады / жабылады
  for (const d of G.doors) {
    const tgt = d.open ? d.sign * 1.85 : 0;
    d.ang += (tgt - d.ang) * (1 - Math.exp(-rdt * 6));
    d.piv.rotation.y = d.ang;
  }
  // Плитка қызарады, шамы жанады
  const { hp } = G;
  hp.plateMat.emissiveIntensity += ((state.heaterOn ? 0.6 : 0) - hp.plateMat.emissiveIntensity) * k;
  setRaw(hp.led.material.color, state.heaterOn ? 0xff3322 : 0x553333);
}
