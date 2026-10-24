import * as THREE from "three";
import type { Base } from "../core/context";
import { boxG, UP, V3 } from "../core/three-utils";
import type { Item } from "../items/types";

/** Қол модельі: алақан, 4 саусақ, бас бармақ және білек (side: 1 — оң, −1 — сол) */
export type Rig = {
  side: number;
  g: THREE.Group;
  palm: THREE.Mesh;
  fingers: THREE.Mesh[];
  thumb: THREE.Mesh;
  cuff: THREE.Mesh;
};

export function makeRig(G: Base, side: number): Rig {
  const skin = G.mats.skin;
  const g = new THREE.Group();
  G.scene.add(g);
  g.visible = false;
  const palm = new THREE.Mesh(boxG(0.016, 0.07, 0.055), skin);
  g.add(palm);
  const fingers = [0, 1, 2, 3].map(() => {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.0072, 0.0072, 1, 10), skin);
    f.rotation.z = Math.PI / 2;
    g.add(f);
    return f;
  });
  const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 1, 10), skin);
  thumb.rotation.z = Math.PI / 2;
  g.add(thumb);
  const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.05, 14), skin);
  G.scene.add(cuff);
  cuff.visible = false;
  for (const m of [palm, thumb, ...fingers, cuff]) m.castShadow = true;
  return { side, g, palm, fingers, thumb, cuff };
}

/** Саусақтарды заттың өлшеміне қарай орналастыру; қолғап кисе — көк */
export function layoutRig(G: Base, rig: Rig, it: Item, gloves: boolean): void {
  const r = it.R;
  const s = Math.min(1, Math.max(0.6, r / 0.03));
  const sd = rig.side;
  rig.palm.position.set(sd * (r + 0.011), 0, 0);
  rig.palm.scale.set(1, s, s);
  rig.fingers.forEach((f, i) => {
    f.scale.set(s, 2 * r + 0.012, s);
    f.position.set(sd * 0.004, (-0.027 + i * 0.018) * s, -(r + 0.007));
  });
  rig.thumb.scale.set(s, r + 0.012, s);
  rig.thumb.position.set(sd * r * 0.5, 0.018 * s, r + 0.007);
  const m = gloves ? G.mats.glove : G.mats.skin;
  for (const x of [rig.palm, rig.thumb, ...rig.fingers, rig.cuff]) x.material = m;
}

/** Қолды зат ұстап тұрған жерге қою, білекті камераға қарай бағыттау */
export function placeRig(G: Base, rig: Rig, it: Item | null): void {
  if (!it) {
    rig.g.visible = rig.cuff.visible = false;
    return;
  }
  rig.g.visible = rig.cuff.visible = true;
  const gy = it.type === "splint" || it.type === "wire" ? 0.035 : it.H * 0.45;
  rig.g.position.copy(it.g.localToWorld(V3(0, gy, 0)));
  rig.g.quaternion.copy(it.g.quaternion);
  const wrist = it.g.localToWorld(V3(rig.side * (it.R + 0.028), gy - 0.035, 0.01));
  const dv = G.camera.localToWorld(V3(rig.side * 0.3, -0.45, 0.1)).sub(wrist).normalize();
  rig.cuff.position.copy(wrist).addScaledVector(dv, 0.02);
  rig.cuff.quaternion.setFromUnitVectors(UP, dv);
}
