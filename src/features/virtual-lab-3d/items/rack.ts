import * as THREE from "three";
import type { Base } from "../core/context";
import { boxG, std, V3 } from "../core/three-utils";
import { tagOf, type Rack } from "./types";

/** Пробирка штативі: n орын, әрқайсысының арасы 4 см */
export function makeRack(G: Base, x: number, y: number, z: number, n: number): Rack {
  const { mesh } = G;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  G.scene.add(g);
  const m = std(0xd6dce4, { r: 0.5 });
  const w = 0.04 * n + 0.03;
  mesh(boxG(w, 0.01, 0.06), m, 0, 0.005, 0, g);
  mesh(boxG(w, 0.008, 0.012), m, 0, 0.07, -0.022, g);
  mesh(boxG(w, 0.008, 0.012), m, 0, 0.07, 0.022, g);
  mesh(boxG(0.01, 0.075, 0.06), m, -w / 2 + 0.005, 0.04, 0, g);
  mesh(boxG(0.01, 0.075, 0.06), m, w / 2 - 0.005, 0.04, 0, g);
  const rack: Rack = { g, slots: [] };
  for (let i = 0; i < n; i++) rack.slots.push({ pos: V3(x - w / 2 + 0.03 + i * 0.04, y + 0.01, z), item: null });
  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      tagOf(o).rack = rack;
      G.interactive.push(o);
    }
  });
  G.racks.push(rack);
  return rack;
}
