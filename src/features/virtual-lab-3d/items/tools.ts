import * as THREE from "three";
import { newVessel } from "@/features/chem-engine";
import type { Base } from "../core/context";
import { C, RAW, std, V3 } from "../core/three-utils";
import { itemBase, registerItem } from "./register";
import type { DTubeItem, FunnelItem, SplintItem, WireItem } from "./types";

/** Воронка және сүзгі қағаз (сұйықтық тамшылап сүзіледі, тұнба қағазда қалады) */
export function makeFunnel(G: Base): FunnelItem {
  const { mesh, mats, tr } = G;
  const g = new THREE.Group();
  G.scene.add(g);
  mesh(new THREE.CylinderGeometry(0.034, 0.004, 0.042, 32, 1, true), mats.glass, 0, 0.045 + 0.021, 0, g, { cast: false }).renderOrder = 4;
  mesh(new THREE.CylinderGeometry(0.0035, 0.0028, 0.048, 12, 1, true), mats.glass, 0, 0.024, 0, g, { cast: false }).renderOrder = 4;
  const paperMat = new THREE.MeshStandardMaterial({ color: RAW(0xf7f7f2), roughness: 0.95, side: THREE.DoubleSide, transparent: true, opacity: 0.93 });
  const paper = mesh(new THREE.ConeGeometry(0.03, 0.036, 24, 1, true), paperMat, 0, 0.048 + 0.018, 0, g, { cast: false });
  paper.rotation.x = Math.PI;
  paper.renderOrder = 3;
  const fliq = mesh(
    new THREE.ConeGeometry(0.028, 0.032, 24),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.5, depthWrite: false }),
    0,
    0,
    0,
    g,
    { cast: false },
  );
  fliq.rotation.x = Math.PI;
  fliq.visible = false;
  fliq.renderOrder = 2;
  const fv = newVessel(tr("vessels.funnel"), 12, "funnel");
  return registerItem(G, {
    ...itemBase(g, 0.087, 0.034, tr("items.funnel.name"), tr("items.funnel.full")),
    type: "funnel",
    fv,
    paper: {},
    paperMat,
    fliq,
    on: null,
    dripT: 0,
  });
}

/** Тығыны бар газ өткізгіш түтік */
export function makeDTube(G: Base): DTubeItem {
  const { mesh, mats, tr } = G;
  const g = new THREE.Group();
  G.scene.add(g);
  mesh(new THREE.CylinderGeometry(0.011, 0.008, 0.016, 16), mats.rubber, 0, 0.008, 0, g);
  const curve = new THREE.CatmullRomCurve3([V3(0, 0.016, 0), V3(0, 0.07, 0), V3(0.02, 0.1, 0), V3(0.07, 0.1, 0), V3(0.1, 0.07, 0), V3(0.1, 0.02, 0)]);
  mesh(new THREE.TubeGeometry(curve, 24, 0.0025, 8, false), mats.glassTube, 0, 0, 0, g, { cast: false }).renderOrder = 4;
  return registerItem(G, { ...itemBase(g, 0.1, 0.012, tr("items.dtube.name"), tr("items.dtube.full")), type: "dtube", A: null, B: null });
}

/** Ағаш шырпы (жаңқа): жағылмаған → жанып тұр → бықсып тұр → жанып біткен */
export function makeSplint(G: Base): SplintItem {
  const { mesh, mats, tr } = G;
  const g = new THREE.Group();
  G.scene.add(g);
  mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 0.16, 8), std(0xd9b27c, { r: 0.9 }), 0, 0.08, 0, g);
  const tip = mesh(
    new THREE.SphereGeometry(0.0032, 10, 8),
    new THREE.MeshStandardMaterial({ color: C(0x2a1a10), emissive: RAW(0xff4a10), emissiveIntensity: 0 }),
    0,
    0.16,
    0,
    g,
    { cast: false },
  );
  const fl = new THREE.Group();
  fl.position.y = 0.165;
  g.add(fl);
  const f1 = new THREE.Mesh(new THREE.ConeGeometry(0.007, 0.03, 12), mats.flame);
  f1.position.y = 0.012;
  fl.add(f1);
  const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.0035, 0.012, 10), mats.flameCore);
  f2.position.y = 0.004;
  fl.add(f2);
  // Прототиптегі қарқындылық (0–0,8) SPLINT_LIGHT көбейткішімен жаңа жарық бірлігіне ауысады
  const light = new THREE.PointLight(C(0xffa040), 0, 1.6, 2);
  light.position.y = 0.02;
  fl.add(light);
  fl.visible = false;
  return registerItem(G, {
    ...itemBase(g, 0.16, 0.003, tr("items.splint.name"), tr("items.splint.full")),
    type: "splint",
    st: "unlit",
    life: 70,
    smolderT: 0,
    tip,
    fl,
    f1,
    light,
  });
}

/** Нихром сым (жалын сынағы үшін) */
export function makeWire(G: Base): WireItem {
  const { mesh, mats, tr } = G;
  const g = new THREE.Group();
  G.scene.add(g);
  mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.11, 10), mats.glassTube, 0, 0.055, 0, g, { cast: false }).renderOrder = 4;
  mesh(new THREE.CylinderGeometry(0.0007, 0.0007, 0.05, 6), std(0x8d8f93, { m: 0.8, r: 0.3 }), 0, 0.135, 0, g);
  const loop = mesh(new THREE.TorusGeometry(0.003, 0.0007, 6, 14), std(0x8d8f93, { m: 0.8, r: 0.3 }), 0, 0.163, 0, g);
  loop.rotation.y = Math.PI / 2;
  return registerItem(G, {
    ...itemBase(g, 0.166, 0.004, tr("items.wire.name"), tr("items.wire.full")),
    type: "wire",
    sample: {},
    acid: false,
    naRes: false,
  });
}
