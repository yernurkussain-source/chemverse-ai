import * as THREE from "three";
import { ROOM, type Base } from "../core/context";
import { boxG, canvasTex, RAW, std } from "../core/three-utils";
import { tagOf } from "../items/types";
import { signTex } from "./cabinets";

export type Ppe = { goggles: THREE.Group; gloves: THREE.Group };

/** Сол жақ қабырғадағы жеке қорғаныс құралдары: көзілдірік (ілгіште) және қолғап қорабы */
export function buildPpe(G: Base): Ppe {
  const { mesh, tr, interactive } = G;
  const x = ROOM.x0;
  mesh(boxG(0.03, 0.6, 0.9), std(0xdfe5ec, { r: 0.7 }), x + 0.015, 1.45, 0.9, null, { cast: false });
  mesh(new THREE.PlaneGeometry(0.85, 0.12), new THREE.MeshBasicMaterial({ map: signTex(tr("scene.ppe").toUpperCase(), "#0f766e") }), x + 0.032, 1.82, 0.9, null, {
    cast: false,
  }).rotation.y = Math.PI / 2;

  const gg = new THREE.Group();
  gg.position.set(x + 0.07, 1.5, 0.7);
  gg.rotation.y = Math.PI / 2;
  G.scene.add(gg);
  const lens = new THREE.MeshPhysicalMaterial({ color: RAW(0xcfe9ff), transparent: true, opacity: 0.45, roughness: 0.05, clearcoat: 1 });
  const fr = std(0x2b2f36, { r: 0.5 });
  for (const xx of [-0.035, 0.035]) {
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 24), lens, xx, 0, 0, gg).rotation.x = Math.PI / 2;
    mesh(new THREE.TorusGeometry(0.03, 0.004, 8, 24), fr, xx, 0, 0, gg);
  }
  mesh(boxG(0.012, 0.01, 0.01), fr, 0, 0.005, 0, gg);
  mesh(new THREE.TorusGeometry(0.08, 0.004, 6, 30, Math.PI), std(0x1e3a8a), 0, 0, -0.04, gg).rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.06, 8), std(0x9aa3ae, { m: 0.6 }), x + 0.03, 1.56, 0.7).rotation.z = Math.PI / 2;
  gg.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      tagOf(m).ppe = "goggles";
      interactive.push(m);
    }
  });

  const gb = new THREE.Group();
  gb.position.set(x + 0.11, 1.28, 1.1);
  G.scene.add(gb);
  mesh(boxG(0.14, 0.03, 0.3), std(0xdfe5ec), 0, -0.08, 0, gb);
  const boxTex = canvasTex(256, 128, (c, w) => {
    c.fillStyle = "#e8f1ff";
    c.fillRect(0, 0, w, 128);
    c.fillStyle = "#1d4ed8";
    c.font = "bold 40px Arial";
    c.textAlign = "center";
    c.fillText(tr("scene.gloves").toUpperCase(), w / 2, 60, w - 16);
    c.font = "22px Arial";
    c.fillText(tr("scene.glovesSub"), w / 2, 100, w - 16);
  });
  mesh(boxG(0.12, 0.11, 0.24), std(0xffffff, { map: boxTex }), 0, 0, 0, gb);
  mesh(new THREE.SphereGeometry(0.035, 12, 8), std(0x3b82f6, { r: 0.6 }), 0, 0.06, 0.03, gb).scale.set(1.2, 0.6, 1.6);
  mesh(new THREE.SphereGeometry(0.03, 12, 8), std(0x3b82f6, { r: 0.6 }), 0.02, 0.06, -0.05, gb).scale.set(1.1, 0.6, 1.5);
  gb.traverse((m) => {
    if ((m as THREE.Mesh).isMesh) {
      tagOf(m).ppe = "gloves";
      interactive.push(m);
    }
  });
  G.collider(ROOM.x0, ROOM.x0 + 0.2, 0.3, 1.4);
  return { goggles: gg, gloves: gb };
}
