import * as THREE from "three";
import { newVessel, type Vessel } from "@/features/chem-engine";
import type { Base } from "../core/context";
import { boxG, canvasTex, std } from "../core/three-utils";
import { tagOf, type BuretteTarget } from "../items/types";
import type { Bench } from "./bench";

type DropMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

/**
 * Бюретка штативте (50 мл): v — ішіндегі ерітінді, stop — кран (0 жабық, 1 тамшылап, 2 ағынмен),
 * readStart — кран ашылғандағы көрсеткіш, spillWarned — астында ыдыс жоқ деп ескертілді ме.
 */
export type Burette = {
  x: number;
  z: number;
  v: Vessel;
  stop: number;
  readStart: number | null;
  spillWarned: boolean;
  dripT: number;
  g: THREE.Group;
  H: number;
  handle: THREE.Mesh;
  liq: DropMesh;
  stream: DropMesh;
  drops: (DropMesh & { userData: { vy: number; to: number } })[];
  target: BuretteTarget;
};

/** Көрсеткіш жоғарыдан төмен оқылады: 0 — толы, 50 — бос */
export const burReading = (bur: Burette) => 50 - bur.v.V;

export function buildBurette(G: Base, bench: Bench): Burette {
  const { mesh, mats, tr } = G;
  const x = -0.95;
  const z = 0.1;
  const top = bench.top;
  const metal = std(0x9aa3ae, { m: 0.7, r: 0.3 });
  mesh(boxG(0.17, 0.012, 0.24), std(0x2f3540, { r: 0.5 }), x, top + 0.006, z + 0.03, null, { surface: true });
  mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.78, 12), metal, x, top + 0.39, z - 0.07);
  mesh(boxG(0.012, 0.012, 0.075), metal, x, top + 0.47, z - 0.035);
  mesh(new THREE.TorusGeometry(0.009, 0.0025, 8, 16), metal, x, top + 0.47, z).rotation.x = Math.PI / 2;
  const g = new THREE.Group();
  g.position.set(x, top + 0.16, z);
  G.scene.add(g);
  const tube = mesh(new THREE.CylinderGeometry(0.0065, 0.0065, 0.42, 20, 1, true), mats.glass, 0, 0.25, 0, g, { cast: false });
  tube.renderOrder = 4;
  const sc = canvasTex(64, 512, (c, w, h) => {
    c.fillStyle = "rgba(255,255,255,.9)";
    c.strokeStyle = "rgba(255,255,255,.9)";
    c.font = "bold 15px Arial";
    for (let i = 0; i <= 50; i++) {
      const y = 8 + ((h - 16) * i) / 50;
      c.lineWidth = i % 5 === 0 ? 2.2 : 1;
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(i % 5 === 0 ? 30 : 16, y);
      c.stroke();
      if (i % 10 === 0) c.fillText(String(i), 34, y + 5);
    }
  });
  mesh(
    new THREE.CylinderGeometry(0.0067, 0.0067, 0.4, 16, 1, true, -0.6, 1.2),
    new THREE.MeshBasicMaterial({ map: sc, transparent: true, depthWrite: false }),
    0,
    0.25,
    0,
    g,
    { cast: false },
  ).renderOrder = 5;
  mesh(new THREE.CylinderGeometry(0.0065, 0.0015, 0.035, 16, 1, true), mats.glass, 0, 0.0175, 0, g, { cast: false }).renderOrder = 4;
  const cock = mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.03, 12), std(0xe9edf2, { r: 0.4 }), 0, 0.045, 0, g);
  cock.rotation.z = Math.PI / 2;
  const handle = mesh(boxG(0.006, 0.03, 0.004), std(0xd23a3a, { r: 0.5 }), 0.018, 0.045, 0, g);
  for (const m of [cock, handle]) {
    tagOf(m).stopcock = true;
    G.interactive.push(m);
  }
  tagOf(tube).burette = true;
  G.interactive.push(tube);
  const liquid = () => new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.4, depthWrite: false });
  const liq = mesh(new THREE.CylinderGeometry(0.0056, 0.0056, 1, 14), liquid(), 0, 0, 0, g, { cast: false });
  liq.renderOrder = 1;
  liq.visible = false;
  const stream = mesh(
    new THREE.CylinderGeometry(0.0009, 0.0009, 1, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false }),
    0,
    0,
    0,
    null,
    { cast: false },
  );
  stream.visible = false;
  const drops = [0, 1, 2, 3].map(() => {
    const m = mesh(
      new THREE.SphereGeometry(0.0017, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.75 }),
      0,
      -5,
      0,
      null,
      { cast: false },
    ) as Burette["drops"][number];
    m.visible = false;
    m.userData.vy = 0;
    m.userData.to = 0;
    return m;
  });
  G.collider(x - 0.06, x + 0.06, z - 0.1, z + 0.02);
  const name = tr("vessels.burette");
  return {
    x,
    z,
    v: newVessel(name, 50, "burette"),
    stop: 0,
    readStart: null,
    spillWarned: false,
    dripT: 0,
    g,
    H: 0.46,
    handle,
    liq,
    stream,
    drops,
    target: { type: "burette", g, H: 0.46, name },
  };
}
