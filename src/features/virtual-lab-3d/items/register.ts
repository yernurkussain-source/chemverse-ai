import * as THREE from "three";
import type { Base } from "../core/context";
import { UP } from "../core/three-utils";
import { tagOf, type Item } from "./types";

/** Затты тіркеу: оның барлық бөлігі raycast-та «осы зат» деп танылады */
export function registerItem<T extends Item>(G: Base, it: T): T {
  it.g.traverse((m) => {
    const mesh = m as THREE.Mesh;
    if (mesh.isMesh && !(m as THREE.InstancedMesh).isInstancedMesh) {
      tagOf(m).item = it;
      G.interactive.push(m);
      m.castShadow = !(mesh.material as THREE.Material).transparent;
    }
  });
  G.items.push(it);
  return it;
}

export function placeAt(it: Item, pos: THREE.Vector3, yaw = 0): void {
  it.rest = { pos: pos.clone(), quat: new THREE.Quaternion().setFromAxisAngle(UP, yaw) };
  it.g.position.copy(pos);
  it.g.quaternion.copy(it.rest.quat);
}

export function setHome(it: Item): void {
  if (!it.rest) return;
  it.home = { pos: it.rest.pos.clone(), quat: it.rest.quat.clone() };
}

/** Жаңа заттың ортақ өрістері */
export const itemBase = (g: THREE.Group, H: number, R: number, name: string, full: string) => ({
  g,
  H,
  R,
  name,
  full,
  rest: null,
  home: null,
  slot: null,
});
