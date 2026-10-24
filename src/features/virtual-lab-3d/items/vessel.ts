import * as THREE from "three";
import { newVessel } from "@/features/chem-engine";
import type { Base } from "../core/context";
import { canvasTex } from "../core/three-utils";
import { itemBase, registerItem } from "./register";
import type { LabVessel, VesselItem } from "./types";

/** Ыдыстың үстіндегі нөмір белгісі (1, 2, П1 …) */
function labelSprite(text: string) {
  const t = canvasTex(128, 128, (x) => {
    x.fillStyle = "rgba(11,21,48,.86)";
    x.beginPath();
    x.arc(64, 64, 54, 0, 7);
    x.fill();
    x.fillStyle = "#fff";
    x.font = "bold 60px Arial";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, 64, 68, 100);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false }));
  s.scale.set(0.02, 0.02, 1);
  s.renderOrder = 7;
  return s;
}

/** Стакандағы өлшеу шкаласы (10 мл сайын) */
function scaleTex(maxV: number) {
  return canvasTex(256, 256, (x, w, h) => {
    x.strokeStyle = "rgba(255,255,255,.85)";
    x.fillStyle = "rgba(255,255,255,.9)";
    x.font = "bold 22px Arial";
    const steps = maxV / 10;
    for (let i = 1; i <= steps; i++) {
      const y = h - (i / steps) * h * 0.92;
      const major = i % 2 === 0;
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(60, y);
      x.lineTo(major ? 150 : 110, y);
      x.stroke();
      if (major) x.fillText(String(i * 10), 160, y + 8);
    }
  });
}

/** Стакан (100 мл) не пробирка (20 мл): шыны, сұйықтық, тұнба қабаты, көпіршіктер, бөлшектер, бу */
export function makeVessel(G: Base, name: string, short: string, kind: "beaker" | "tube"): VesselItem {
  const { mesh, mats } = G;
  const cap = kind === "beaker" ? 100 : 20;
  const r = kind === "beaker" ? 0.033 : 0.0095;
  const h = kind === "beaker" ? 0.088 : 0.13;
  const s = newVessel(name, cap, kind);
  const g = new THREE.Group();
  G.scene.add(g);
  mesh(new THREE.CylinderGeometry(r, r * (kind === "beaker" ? 0.97 : 1), h, 36, 1, true), mats.glass, 0, h / 2, 0, g, { cast: false }).renderOrder = 4;
  mesh(new THREE.CircleGeometry(r, 36), mats.glass, 0, 0.0015, 0, g, { cast: false }).rotation.x = -Math.PI / 2;
  mesh(new THREE.TorusGeometry(r, 0.0014, 8, 36), mats.glass, 0, h, 0, g, { cast: false }).rotation.x = Math.PI / 2;
  if (kind === "beaker") {
    mesh(
      new THREE.CylinderGeometry(r * 1.003, r * 1.003, h, 24, 1, true, -0.45, 0.9),
      new THREE.MeshBasicMaterial({ map: scaleTex(cap), transparent: true, depthWrite: false }),
      0,
      h / 2,
      0,
      g,
      { cast: false },
    ).renderOrder = 5;
  }
  const liq = mesh(
    new THREE.CylinderGeometry(r * 0.92, r * 0.92, 1, 30),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }),
    0,
    0,
    0,
    g,
    { cast: false },
  );
  liq.renderOrder = 1;
  liq.visible = false;
  const surf = mesh(
    new THREE.CircleGeometry(r * 0.92, 30),
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.02, depthWrite: false }),
    0,
    0,
    0,
    g,
    { cast: false },
  );
  surf.rotation.x = -Math.PI / 2;
  surf.renderOrder = 2;
  surf.visible = false;
  const layer = mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 1, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 }), 0, 0, 0, g, {
    cast: false,
  });
  layer.visible = false;
  layer.renderOrder = 2;
  const bub = new THREE.InstancedMesh(
    mats.bubbleGeo,
    new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.05, depthWrite: false }),
    40,
  );
  bub.count = 0;
  bub.frustumCulled = false;
  bub.renderOrder = 3;
  g.add(bub);
  const par = new THREE.InstancedMesh(mats.parGeo, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }), 60);
  par.count = 0;
  par.frustumCulled = false;
  par.renderOrder = 3;
  g.add(par);
  const lab = labelSprite(short);
  lab.position.set(0, h + 0.02, 0);
  g.add(lab);
  const pieces = new THREE.Group();
  g.add(pieces);
  const stopper = mesh(new THREE.CylinderGeometry(r * 1.15, r * 0.85, 0.016, 16), mats.rubber, 0, h + 0.002, 0, g);
  stopper.visible = false;
  const steam: LabVessel["steam"] = [];
  for (let i = 0; i < 8; i++) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: mats.steamTex, transparent: true, opacity: 0, depthWrite: false }));
    sp.visible = false;
    g.add(sp);
    steam.push({ sp, t: Math.random(), x: 0 });
  }
  const o = {
    s,
    g,
    r,
    h,
    cap,
    kind,
    liq,
    surf,
    layer,
    bub,
    par,
    pieces,
    steam,
    stopper,
    lab,
    bubs: Array.from({ length: 40 }, () => ({ x: 0, y: -1, z: 0, v: 0, s: 0 })),
    pars: Array.from({ length: 60 }, () => ({
      x: (Math.random() - 0.5) * 1.4 * r,
      y: Math.random(),
      z: (Math.random() - 0.5) * 1.4 * r,
      s: 0.0007 + Math.random() * 0.001,
    })),
    pieceMeshes: [],
    head: { H2: 0, CO2: 0, O2: 0 },
    link: null,
    linkIn: null,
    funnel: null,
  } as Omit<LabVessel, "it"> as LabVessel;
  G.vesselOf.set(s, o);
  G.vessels.push(o);
  const it = registerItem(G, { ...itemBase(g, h, r, name, name), type: "vessel", v: o });
  o.it = it;
  return it;
}
