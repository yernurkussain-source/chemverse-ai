import * as THREE from "three";
import type { Base } from "../core/context";
import { C, CR, RAW, std } from "../core/three-utils";
import { tagOf, type LampTarget } from "../items/types";
import type { Bench } from "./bench";

/** Спиртовка: lit — жанып тұр ма, col / target — жалынның қазіргі / мақсат түсі (жалын сынағы), showT — түстің ұзақтығы */
export type Lamp = {
  x: number;
  z: number;
  lit: boolean;
  col: [number, number, number];
  target: [number, number, number];
  showT: number;
  g: THREE.Group;
  cap: THREE.Group;
  fl: THREE.Group;
  outer: THREE.MeshBasicMaterial;
  f1: THREE.Mesh;
  light: THREE.PointLight;
  anchor: LampTarget;
};

export function buildLamp(G: Base, bench: Bench): Lamp {
  const { mesh, mats, tr } = G;
  const x = 1.0;
  const z = 0.16;
  const g = new THREE.Group();
  g.position.set(x, bench.top, z);
  G.scene.add(g);
  const parts: THREE.Mesh[] = [
    mesh(new THREE.CylinderGeometry(0.038, 0.04, 0.045, 28), mats.glass, 0, 0.0225, 0, g, { cast: false }),
    mesh(new THREE.CylinderGeometry(0.014, 0.038, 0.022, 28, 1, true), mats.glass, 0, 0.056, 0, g, { cast: false }),
  ];
  mesh(
    new THREE.CylinderGeometry(0.035, 0.036, 0.03, 24),
    new THREE.MeshStandardMaterial({ color: CR(220, 235, 250), transparent: true, opacity: 0.35, depthWrite: false }),
    0,
    0.016,
    0,
    g,
    { cast: false },
  ).renderOrder = 1;
  parts.push(mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.014, 16), std(0xb8bec7, { m: 0.7, r: 0.3 }), 0, 0.074, 0, g));
  parts.push(mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.012, 10), std(0xf1efe6, { r: 0.9 }), 0, 0.086, 0, g));
  const tagLamp = (m: THREE.Mesh) => {
    m.renderOrder = 4;
    tagOf(m).lamp = true;
    G.interactive.push(m);
  };
  parts.forEach(tagLamp);
  const cap = new THREE.Group();
  cap.position.set(0, 0.07, 0);
  g.add(cap);
  tagLamp(mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.03, 20), mats.glass, 0, 0.015, 0, cap, { cast: false }));
  tagLamp(mesh(new THREE.SphereGeometry(0.016, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mats.glass, 0, 0.03, 0, cap, { cast: false }));
  const fl = new THREE.Group();
  fl.position.y = 0.092;
  g.add(fl);
  fl.visible = false;
  const outer = new THREE.MeshBasicMaterial({ color: RAW(0x99bbff), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false });
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.0095, 0.05, 16), outer);
  f1.position.y = 0.024;
  fl.add(f1);
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.0045, 0.016, 12), mats.flameCore);
  f2.position.y = 0.007;
  fl.add(f2);
  const light = new THREE.PointLight(C(0x9fbfff), 0, 1.4, 2);
  light.position.y = 0.03;
  fl.add(light);
  const anchorObj = new THREE.Object3D();
  anchorObj.position.set(0, 0.118, 0);
  g.add(anchorObj);
  G.collider(x - 0.04, x + 0.04, z - 0.04, z + 0.04);
  return {
    x,
    z,
    lit: false,
    col: [150, 190, 255],
    target: [150, 190, 255],
    showT: 0,
    g,
    cap,
    fl,
    outer,
    f1,
    light,
    anchor: { type: "lamp", g: anchorObj, H: 0, name: tr("items.lampFlame") },
  };
}
