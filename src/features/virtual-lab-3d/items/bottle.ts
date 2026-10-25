import * as THREE from "three";
import { LIQUIDS, REAG_BY, type IndicatorId, type LiquidId, type ReagentId, type SolidId } from "@/features/chem-engine";
import type { Base } from "../core/context";
import { canvasTex, CR, std } from "../core/three-utils";
import { reagentAmount, reagentShort } from "../game/i18n";
import { pieceMesh, REAG_LIQ_COL } from "./materials";
import { itemBase, registerItem } from "./register";
import type { ReagentItem } from "./types";

/** Бөтелке қақпағының түсі: қызыл — қышқыл, көк — сілті, қара — қауіпті тұз, сұр — қалғандары */
const BOTTLE: Record<LiquidId, { cap: number; amber?: boolean }> = {
  HCl: { cap: 0xd23a3a },
  H2SO4: { cap: 0xd23a3a },
  NaOH: { cap: 0x2f5fd0 },
  CaOH2: { cap: 0x2f5fd0 },
  Na2CO3: { cap: 0x7d8799 },
  NaCl: { cap: 0x7d8799 },
  KI: { cap: 0x7d8799 },
  AgNO3: { cap: 0x3a3a3a, amber: true },
  BaCl2: { cap: 0x3a3a3a },
  CuSO4: { cap: 0x3a3a3a },
  FeCl3: { cap: 0x3a3a3a },
  H2O: { cap: 0x9fb7c9 },
  H2O2: { cap: 0xe9e9e9 },
};

const hex = (n: number) => "#" + n.toString(16).padStart(6, "0");

/** Затбелгі: жоғарғы жолақ (түрі), формула, концентрация не масса, қауіп белгісі (X бөтелкесінде — «X» және «?») */
function labelTex(G: Base, id: ReagentId, mystery = false) {
  const r = REAG_BY[id];
  const f = mystery ? "X" : reagentShort(G.tr, id);
  const amount = mystery ? "?" : reagentAmount(G.tr, id, G.locale);
  const haz = mystery || (r.kind === "liq" && LIQUIDS[r.id].haz);
  return canvasTex(256, 128, (x, w) => {
    x.fillStyle = "#fbfaf6";
    x.fillRect(0, 0, w, 128);
    x.fillStyle = mystery ? "#4b5563" : r.kind === "liq" ? hex(BOTTLE[r.id].cap) : r.kind === "ind" ? "#7a3fa0" : "#4b5563";
    x.fillRect(0, 0, w, 16);
    x.fillStyle = "#111827";
    x.textAlign = "center";
    x.font = "bold " + (f.length > 5 ? 40 : 52) + "px Arial";
    x.fillText(f, w / 2, 74, w - 12);
    x.font = "22px Arial";
    x.fillStyle = "#374151";
    x.fillText(amount, w / 2, 108, w - 40);
    if (haz) {
      x.fillStyle = "#e85d04";
      x.beginPath();
      x.moveTo(18, 96);
      x.lineTo(34, 124);
      x.lineTo(2, 124);
      x.closePath();
      x.fill();
      x.fillStyle = "#fff";
      x.font = "bold 20px Arial";
      x.fillText("!", 18, 122);
    }
  });
}

/** Ерітінді бөтелкесі, индикатор тамызғышы не қатты зат құтысы. mystery — «X» бөтелкесі (ішіндегісі жасырын) */
export function makeBottle(G: Base, id: ReagentId, mystery = false): ReagentItem {
  const { mesh, mats, tr } = G;
  const r = REAG_BY[id];
  const g = new THREE.Group();
  G.scene.add(g);
  const short = mystery ? "X" : reagentShort(tr, id);
  const amount = mystery ? "" : reagentAmount(tr, id, G.locale);
  const full = mystery ? tr("mystery.full") : tr(`reagents.${id}.name`);
  const label = () => new THREE.MeshStandardMaterial({ map: labelTex(G, id, mystery), roughness: 0.8 });

  if (r.kind === "liq") {
    const R = 0.03;
    const style = mystery ? { cap: 0x7d8799 } : BOTTLE[r.id];
    const gm = "amber" in style && style.amber ? mats.amber : mats.glass;
    mesh(new THREE.CylinderGeometry(R, R, 0.1, 32), gm, 0, 0.05, 0, g, { cast: false }).renderOrder = 4;
    const lc = REAG_LIQ_COL[r.id] || [214, 232, 244];
    const liq = new THREE.MeshStandardMaterial({ color: CR(...lc), transparent: true, opacity: REAG_LIQ_COL[r.id] ? 0.85 : 0.32, roughness: 0.1, depthWrite: false });
    mesh(new THREE.CylinderGeometry(R - 0.003, R - 0.003, 0.072, 28), liq, 0, 0.038, 0, g, { cast: false }).renderOrder = 1;
    mesh(new THREE.CylinderGeometry(0.013, R, 0.018, 28, 1, true), gm, 0, 0.109, 0, g, { cast: false }).renderOrder = 4;
    mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.014, 20), gm, 0, 0.125, 0, g, { cast: false }).renderOrder = 4;
    const cap = mesh(new THREE.CylinderGeometry(0.0145, 0.0145, 0.018, 20), std(style.cap, { r: 0.5 }), 0, 0.141, 0, g);
    mesh(new THREE.CylinderGeometry(R + 0.0004, R + 0.0004, 0.05, 24, 1, true, -1.15, 2.3), label(), 0, 0.048, 0, g, { cast: false });
    const item = { ...itemBase(g, 0.132, R, amount ? `${short} ${amount}` : short, full), type: "bottle" as const, rid: r.id, cap };
    return registerItem(G, mystery ? { ...item, mystery, liq } : item);
  }

  if (r.kind === "ind") {
    const R = 0.018;
    mesh(new THREE.CylinderGeometry(R, R, 0.055, 24), mats.amber, 0, 0.0275, 0, g, { cast: false }).renderOrder = 4;
    mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.012, 16), std(0x222222), 0, 0.061, 0, g);
    mesh(new THREE.SphereGeometry(0.01, 16, 12), std(0x2b2b2b, { r: 0.7 }), 0, 0.078, 0, g).scale.y = 1.4;
    mesh(new THREE.CylinderGeometry(R + 0.0004, R + 0.0004, 0.03, 20, 1, true, -1.2, 2.4), label(), 0, 0.026, 0, g, { cast: false });
    return registerItem(G, { ...itemBase(g, 0.055, R, short, full), type: "dropper", rid: r.id as IndicatorId });
  }

  const R = 0.03;
  mesh(new THREE.CylinderGeometry(R, R, 0.05, 28), mats.glass, 0, 0.025, 0, g, { cast: false }).renderOrder = 4;
  const cap = mesh(new THREE.CylinderGeometry(R + 0.002, R + 0.002, 0.01, 28), std(0xf4f4f4, { r: 0.6 }), 0, 0.055, 0, g);
  mesh(new THREE.CylinderGeometry(R + 0.0004, R + 0.0004, 0.024, 24, 1, true, -1.2, 2.4), label(), 0, 0.022, 0, g, { cast: false });
  for (let i = 0; i < 4; i++) {
    const pm = pieceMesh(r.id as SolidId, 0.6).obj;
    pm.position.set((Math.random() - 0.5) * 0.03, 0.006 + i * 0.002, (Math.random() - 0.5) * 0.024);
    pm.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    g.add(pm);
  }
  return registerItem(G, { ...itemBase(g, 0.05, R, short, full), type: "jar", rid: r.id as SolidId, cap });
}
