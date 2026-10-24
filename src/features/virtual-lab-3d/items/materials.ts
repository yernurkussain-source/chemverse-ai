import * as THREE from "three";
import type { SolidId } from "@/features/chem-engine";
import { boxG, C, canvasTex, RAW, std } from "../core/three-utils";
import type { PieceMesh } from "./types";

/** Заттарға ортақ материалдар мен геометриялар (бір ойынға бір рет жасалады) */
export function createMaterials() {
  return {
    glass: new THREE.MeshPhysicalMaterial({
      color: RAW(0xffffff),
      transparent: true,
      opacity: 0.2,
      roughness: 0.05,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
    glassTube: new THREE.MeshPhysicalMaterial({ color: RAW(0xeaf6ff), transparent: true, opacity: 0.42, roughness: 0.05, clearcoat: 1, depthWrite: false }),
    amber: new THREE.MeshPhysicalMaterial({ color: C(0x8a4b12), transparent: true, opacity: 0.65, roughness: 0.15, clearcoat: 1, depthWrite: false }),
    rubber: std(0x7a1f1f, { r: 0.8 }),
    flame: new THREE.MeshBasicMaterial({ color: RAW(0xffa53a), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }),
    flameCore: new THREE.MeshBasicMaterial({ color: RAW(0x7fb6ff), transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false }),
    skin: std(0xe2b48e, { r: 0.65 }),
    glove: std(0x3b82f6, { r: 0.55 }),
    bubbleGeo: new THREE.SphereGeometry(1, 8, 6),
    parGeo: new THREE.SphereGeometry(1, 5, 4),
    steamTex: canvasTex(64, 64, (x) => {
      const g = x.createRadialGradient(32, 32, 2, 32, 32, 30);
      g.addColorStop(0, "rgba(255,255,255,.9)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
    }),
  };
}
export type Materials = ReturnType<typeof createMaterials>;

/** Түсті ерітінділердің бөтелкедегі түсі (қалғандары мөлдір) */
export const REAG_LIQ_COL: Partial<Record<string, [number, number, number]>> = { CuSO4: [60, 130, 226], FeCl3: [200, 120, 30] };

const PIECE_COLOR: Record<SolidId, number> = { Mg: 0xbfc4cb, Zn: 0xa3acb6, Fe: 0x6b7078, Cu: 0xc8743c, CaCO3: 0xf0eee8, MnO2: 0x1e1b18 };

function pieceMat(id: SolidId): THREE.MeshStandardMaterial {
  const dull = id === "CaCO3" || id === "MnO2";
  return new THREE.MeshStandardMaterial({ color: C(PIECE_COLOR[id]), metalness: dull ? 0 : 0.75, roughness: dull ? 0.9 : 0.35 });
}

/** Қатты кесектің модельі: Mg — таспа, Zn — түйіршік, Fe — шеге, Cu — сым ширатпасы, MnO₂ — ұнтақ, мәрмәр — кесек */
export function pieceMesh(id: SolidId, sc = 1): PieceMesh {
  const mat = pieceMat(id);
  let obj: THREE.Object3D;
  if (id === "Mg") obj = new THREE.Mesh(boxG(0.026 * sc, 0.0007, 0.005 * sc), mat);
  else if (id === "Zn") obj = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0055 * sc, 0), mat);
  else if (id === "Fe") {
    obj = new THREE.Group();
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.0015 * sc, 0.0011 * sc, 0.034 * sc, 10), mat);
    const hd = new THREE.Mesh(new THREE.CylinderGeometry(0.0038 * sc, 0.0038 * sc, 0.0014, 14), mat);
    hd.position.y = 0.017 * sc;
    obj.add(sh, hd);
  } else if (id === "Cu") obj = new THREE.Mesh(new THREE.TorusGeometry(0.007 * sc, 0.0011 * sc, 6, 24, Math.PI * 3.2), mat);
  else if (id === "MnO2") {
    obj = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.0026 * sc, 0), mat);
      b.position.set((Math.random() - 0.5) * 0.008 * sc, 0, (Math.random() - 0.5) * 0.008 * sc);
      obj.add(b);
    }
  } else obj = new THREE.Mesh(new THREE.DodecahedronGeometry(0.006 * sc, 0), mat);
  obj.castShadow = true;
  return { obj, mat, base: mat.color.clone() };
}
