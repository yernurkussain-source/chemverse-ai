import * as THREE from "three";
import type { IndicatorId, SolidId } from "@/features/chem-engine";
import type { Base } from "../core/context";
import type { VesselItem } from "../items/types";

type FxMesh = THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>;

/**
 * Құю мен тамызудың көрінетін бөліктері: ағын, воронкадан тамған тамшылар, индикатор тамшысы,
 * құлап бара жатқан қатты кесектер, газ өткізгіш түтіктің иілген бөлігі (dyn).
 */
export type Effects = {
  stream: FxMesh;
  drips: (FxMesh & { userData: { vy: number; t: VesselItem | null } })[];
  drop: FxMesh & { userData: { t: VesselItem | null; vy: number; id: IndicatorId | null } };
  falling: { m: THREE.Object3D; t: VesselItem; id: SolidId; v: number }[];
  dyn: { mesh: THREE.Mesh | null; key: string };
};

export function createEffects(G: Base): Effects {
  const { mesh } = G;
  const stream = mesh(
    new THREE.CylinderGeometry(0.0016, 0.0012, 1, 10),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false }),
    0,
    0,
    0,
    null,
    { cast: false },
  );
  stream.visible = false;
  stream.renderOrder = 3;
  const drips = [0, 1, 2].map(() => {
    const m = mesh(
      new THREE.SphereGeometry(0.0018, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }),
      0,
      -5,
      0,
      null,
      { cast: false },
    ) as Effects["drips"][number];
    m.visible = false;
    m.userData.vy = 0;
    m.userData.t = null;
    return m;
  });
  const drop = mesh(
    new THREE.SphereGeometry(0.0022, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 }),
    0,
    -5,
    0,
    null,
    { cast: false },
  ) as Effects["drop"];
  drop.visible = false;
  drop.userData.t = null;
  drop.userData.vy = 0;
  drop.userData.id = null;
  return { stream, drips, drop, falling: [], dyn: { mesh: null, key: "" } };
}
