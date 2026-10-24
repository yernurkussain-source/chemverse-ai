import * as THREE from "three";
import type { Base } from "../core/context";
import { boxG, C, canvasTex, RAW, std } from "../core/three-utils";
import { tagOf } from "../items/types";

/** Орталық үстел: орталығы (x, z), өлшемі (w × d), үстінің биіктігі top */
export type Bench = { x: number; z: number; w: number; d: number; top: number };
/** Плитка: үстіңгі беті (top), қызатын дискінің материалы, қосылғанын көрсететін шам */
export type HotPlate = { x: number; z: number; top: number; plateMat: THREE.MeshStandardMaterial; led: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial> };

/** Үстел, плитка (ауыстырғышымен), қалдық ыдысы және орындықтар */
export function buildBench(G: Base): { bench: Bench; hp: HotPlate } {
  const { mesh, tr, interactive } = G;
  const bench: Bench = { x: 0, z: 0.35, w: 2.6, d: 1.0, top: 0.925 };
  mesh(boxG(bench.w, 0.05, bench.d), std(0x26303c, { r: 0.42 }), bench.x, 0.9, bench.z, null, { surface: true, block: true });
  mesh(boxG(bench.w - 0.1, 0.86, bench.d - 0.1), std(0xe6eaef, { r: 0.7 }), bench.x, 0.43, bench.z, null, { block: true });
  for (let i = -2; i <= 2; i++) {
    mesh(boxG(0.003, 0.7, 0.003), std(0xbfc7d1), i * 0.5, 0.45, bench.z + bench.d / 2 - 0.049, null, { cast: false });
  }
  G.collider(bench.x - bench.w / 2, bench.x + bench.w / 2, bench.z - bench.d / 2, bench.z + bench.d / 2);

  // Плитка
  const x = 0.62;
  const z = 0.32;
  const top = bench.top + 0.037;
  mesh(boxG(0.17, 0.035, 0.17), std(0xf1f3f6, { r: 0.4 }), x, bench.top + 0.0175, z, null, { block: true });
  const plateMat = new THREE.MeshStandardMaterial({ color: C(0x30343b), roughness: 0.35, emissive: RAW(0xff3a1a), emissiveIntensity: 0 });
  const plate = mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.004, 40), plateMat, x, top - 0.002, z);
  tagOf(plate).heaterTop = true;
  interactive.push(plate);
  const knob = mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.016, 20), std(0xd23a3a, { r: 0.4 }), x + 0.045, bench.top + 0.017, z + 0.092);
  knob.rotation.x = Math.PI / 2;
  tagOf(knob).knob = true;
  interactive.push(knob);
  const led = mesh(new THREE.SphereGeometry(0.005, 10, 8), new THREE.MeshBasicMaterial({ color: RAW(0x553333) }), x - 0.045, bench.top + 0.018, z + 0.086, null, {
    cast: false,
  });

  // Қалдық ыдысы және оның жазуы
  const waste = mesh(boxG(0.16, 0.2, 0.16), std(0x8a9bb0, { r: 0.5 }), 1.1, bench.top + 0.1, 0.62);
  tagOf(waste).waste = true;
  interactive.push(waste);
  const wasteLabel = canvasTex(256, 110, (c, w) => {
    c.fillStyle = "#ffd23f";
    c.fillRect(0, 0, w, 110);
    c.fillStyle = "#1b1b1b";
    c.font = "bold 42px Arial";
    c.textAlign = "center";
    c.fillText(tr("scene.waste").toUpperCase(), w / 2, 52, w - 16);
    c.font = "24px Arial";
    c.fillText(tr("scene.wasteSub"), w / 2, 92, w - 16);
  });
  const wl = mesh(new THREE.PlaneGeometry(0.14, 0.06), new THREE.MeshBasicMaterial({ map: wasteLabel }), 1.1, bench.top + 0.13, 0.701, null, { cast: false });
  tagOf(wl).waste = true;
  interactive.push(wl);

  // Орындықтар
  for (const sx of [-0.6, 0.6]) {
    mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.04, 24), std(0x26303c), sx, 0.65, 1.25);
    mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.63, 10), std(0x9aa3ae, { m: 0.6 }), sx, 0.32, 1.25);
  }

  return { bench, hp: { x, z, top, plateMat, led } };
}
