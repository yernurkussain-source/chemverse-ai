import * as THREE from "three";
import type { Aim, Game } from "../core/context";
import { UP } from "../core/three-utils";
import { tagOf } from "../items/types";

const ray = new THREE.Raycaster();
ray.far = 1.55;
const CENTER = new THREE.Vector2(0, 0);

/** Экранның ортасындағы нүкте (нысана) қай затқа қарап тұр: қолдағы заттар мен көрінбейтіндер өткізіледі */
export function aim(G: Game): Aim | null {
  ray.setFromCamera(CENTER, G.camera);
  const hits = ray.intersectObjects(G.interactive, false);
  for (const h of hits) {
    const u = tagOf(h.object);
    if (u.item && (u.item === G.state.held || u.item === G.state.heldL)) continue;
    let o: THREE.Object3D | null = h.object;
    let vis = true;
    while (o) {
      if (o.visible === false) {
        vis = false;
        break;
      }
      o = o.parent;
    }
    if (!vis) continue;
    const n = h.face ? h.face.normal.clone().transformDirection(h.object.matrixWorld) : UP;
    return { h, u, n };
  }
  return null;
}
