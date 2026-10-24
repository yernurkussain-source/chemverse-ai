import * as THREE from "three";
import type { Game } from "../core/context";
import { UP, V3 } from "../core/three-utils";
import type { Item, PourTarget, Pose } from "../items/types";

const qTmp = new THREE.Quaternion();
const qYaw = new THREE.Quaternion();

/**
 * Құйып (тамызып, сынап) тұрғандағы заттың орны: аузы нысананың аузына қарай еңкейеді.
 * tilt — еңкею бұрышы (рад): тамызғыш тік тұрады, бөтелке 1,75 рад-қа дейін еңкейеді.
 */
export function pourPose(G: Game, it: Item, t: PourTarget): Pose {
  const { player } = G;
  const top = new THREE.Vector3();
  t.g.getWorldPosition(top);
  top.y += t.H;
  const d = V3(top.x - player.x, 0, top.z - player.z);
  if (d.lengthSq() < 1e-6) d.set(0, 0, -1);
  d.normalize();
  const k = new THREE.Vector3().crossVectors(UP, d).normalize();
  const tilt =
    it.type === "dropper" ? 0 : it.type === "jar" ? 1.5 : it.type === "splint" ? 1.15 : it.type === "wire" ? 0.75 : it.type === "vessel" ? 1.45 : 1.75;
  const yaw = Math.atan2(-d.x, -d.z);
  qYaw.setFromAxisAngle(UP, yaw);
  const q = new THREE.Quaternion().setFromAxisAngle(k, tilt).multiply(qYaw);
  if (it.type === "dropper") return { pos: V3(top.x, top.y + 0.05, top.z), quat: qYaw.clone() };
  const mouthDir = UP.clone().applyQuaternion(q);
  const flame = !!G.state.pour?.flame;
  const dy = it.type === "wire" ? (flame ? -0.004 : -t.H * 0.55) : it.type === "splint" ? 0.012 : 0.03;
  const mouth = V3(top.x - d.x * 0.004, top.y + dy, top.z - d.z * 0.004);
  return { pos: mouth.clone().addScaledVector(mouthDir, -it.H), quat: q };
}

/** Қолда ұстап тұрғандағы орны (камераға қатысты); сол қолдағы ыдысқа құйғанда ол ортаға келеді */
export function holdPose(G: Game, it: Item, left: boolean): Pose {
  const { player, state } = G;
  const off = left ? V3(-0.17, -0.2, -0.42) : V3(0.17, -0.2, -0.42);
  if (it.type === "vessel" && it.v.kind === "tube") off.set(left ? -0.14 : 0.15, -0.15, -0.36);
  if (it.type === "splint" || it.type === "wire") off.set(left ? -0.13 : 0.13, -0.2, -0.36);
  if (left && state.pour?.intoLeft) off.set(0.0, -0.19, -0.38);
  off.y += Math.sin(player.bob) * 0.006;
  const p = G.camera.localToWorld(off);
  qYaw.setFromAxisAngle(UP, player.yaw);
  const roll = (left ? 0.06 : -0.06) + (it.type === "splint" || it.type === "wire" ? (left ? 0.5 : -0.5) : 0);
  const q = qYaw.clone().multiply(qTmp.setFromAxisAngle(V3(0, 0, 1), roll));
  return { pos: p, quat: q };
}
