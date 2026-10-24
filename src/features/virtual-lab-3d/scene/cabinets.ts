import * as THREE from "three";
import { ROOM, type Base } from "../core/context";
import { boxG, canvasTex, RAW, std } from "../core/three-utils";
import { tagOf, type Door } from "../items/types";

/** Шкаф: ортасы cx, сөрелердің беті shelfTop[0..2] (төменнен жоғары), заттар тұратын z */
export type Cabinet = { cx: number; z: number; shelfTop: number[] };
export type Cabinets = { acids: Cabinet; salts: Cabinet; glass: Cabinet; other: Cabinet };

export function signTex(text: string, col: string) {
  return canvasTex(512, 80, (x, w, h) => {
    x.fillStyle = col;
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#fff";
    x.font = "bold 34px Arial";
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.fillText(text, w / 2, h / 2 + 2, w - 20);
  });
}

/** Артқы қабырғадағы 4 шкаф (үшеуі шыны есікті) және тартпа шкаф */
export function buildCabinets(G: Base): Cabinets {
  const { mesh, tr, interactive } = G;
  const glassDoorMat = new THREE.MeshPhysicalMaterial({
    color: RAW(0xe8f4ff),
    transparent: true,
    opacity: 0.18,
    roughness: 0.05,
    clearcoat: 1,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const cabinet = (cx: number, name: string, col: string, withDoors: boolean): Cabinet => {
    const w = 1.1;
    const d = 0.42;
    const h = 1.9;
    const z0 = ROOM.z0;
    const zc = z0 + d / 2;
    const body = std(0xf2f4f7, { r: 0.55 });
    mesh(boxG(w, h, 0.02), body, cx, h / 2, z0 + 0.01, null, { block: true });
    mesh(boxG(0.02, h, d), body, cx - w / 2 + 0.01, h / 2, zc, null, { block: true });
    mesh(boxG(0.02, h, d), body, cx + w / 2 - 0.01, h / 2, zc, null, { block: true });
    mesh(boxG(w, 0.02, d), body, cx, h - 0.01, zc, null, { block: true });
    mesh(boxG(w, 0.5, d), std(0xe3e8ee, { r: 0.6 }), cx, 0.25, zc, null, { block: true });
    mesh(boxG(0.003, 0.42, 0.003), std(0xb9c2cd), cx, 0.25, z0 + d + 0.001, null, { cast: false });
    [0.52, 0.95, 1.38].forEach((y, i) => {
      if (i > 0) mesh(boxG(w - 0.04, 0.02, d - 0.03), std(0xe9edf2, { r: 0.5 }), cx, y, zc - 0.005, null, { surface: true });
      else mesh(boxG(w - 0.04, 0.02, d - 0.03), std(0xe9edf2, { r: 0.5 }), cx, y - 0.01, zc - 0.005, null, { surface: true, block: true });
    });
    mesh(new THREE.PlaneGeometry(w, 0.16), new THREE.MeshBasicMaterial({ map: signTex(name.toUpperCase(), col) }), cx, h + 0.1, z0 + 0.02, null, {
      cast: false,
    });
    G.collider(cx - w / 2, cx + w / 2, z0, z0 + d);
    if (withDoors) {
      for (const s of [-1, 1]) {
        const piv = new THREE.Group();
        piv.position.set(cx + (s * w) / 2, 0.52, z0 + d);
        G.scene.add(piv);
        const door: Door = { piv, open: false, ang: 0, sign: s, name };
        const dw = w / 2 - 0.005;
        const dh = h - 0.55;
        const fr = std(0xe7ebf0, { r: 0.45 });
        const g = new THREE.Group();
        g.position.x = (-s * dw) / 2;
        piv.add(g);
        for (const [bw, bh, x, y] of [
          [dw, 0.03, 0, dh - 0.015],
          [dw, 0.03, 0, 0.015],
          [0.03, dh, -dw / 2 + 0.015, dh / 2],
          [0.03, dh, dw / 2 - 0.015, dh / 2],
        ]) {
          const m = mesh(boxG(bw, bh, 0.02), fr, x, y, 0, g);
          tagOf(m).door = door;
          interactive.push(m);
        }
        const pane = mesh(new THREE.PlaneGeometry(dw - 0.05, dh - 0.05), glassDoorMat, 0, dh / 2, 0, g, { cast: false, recv: false });
        pane.renderOrder = 6;
        tagOf(pane).door = door;
        interactive.push(pane);
        const hd = mesh(boxG(0.012, 0.14, 0.02), std(0x9aa3ae, { m: 0.6, r: 0.3 }), -s * (dw / 2 - 0.05), dh * 0.42, 0.02, g);
        tagOf(hd).door = door;
        interactive.push(hd);
        G.doors.push(door);
      }
    }
    return { cx, z: z0 + 0.22, shelfTop: [0.52, 0.96, 1.39] };
  };

  const cabs: Cabinets = {
    acids: cabinet(-2.75, tr("scene.cabAcids"), "#c0392b", true),
    salts: cabinet(-1.4, tr("scene.cabSalts"), "#2c6fb7", true),
    glass: cabinet(-0.05, tr("scene.cabGlass"), "#11806a", true),
    other: cabinet(1.3, tr("scene.cabOther"), "#7a3fa0", false),
  };

  // Тартпа шкаф (оң жақ бұрыш)
  const x = 3.2;
  const w = 1.5;
  const d = 0.75;
  const z0 = ROOM.z0;
  const m = std(0xe9edf2, { r: 0.5 });
  mesh(boxG(w, 0.9, d), m, x, 0.45, z0 + d / 2, null, { block: true });
  mesh(boxG(w, 0.05, d), std(0x2b3440, { r: 0.4 }), x, 0.925, z0 + d / 2, null, { block: true });
  mesh(boxG(w, 0.6, d), m, x, 2.2, z0 + d / 2, null, { block: true });
  mesh(boxG(0.04, 1.0, d), m, x - w / 2 + 0.02, 1.45, z0 + d / 2, null, { block: true });
  mesh(boxG(0.04, 1.0, d), m, x + w / 2 - 0.02, 1.45, z0 + d / 2, null, { block: true });
  mesh(new THREE.PlaneGeometry(w - 0.08, 0.55), glassDoorMat, x, 1.62, z0 + d - 0.02, null, { cast: false }).renderOrder = 6;
  mesh(new THREE.PlaneGeometry(w, 0.14), new THREE.MeshBasicMaterial({ map: signTex(tr("scene.fumeHood").toUpperCase(), "#475569") }), x, 2.42, z0 + d + 0.001, null, {
    cast: false,
  });
  G.collider(x - w / 2, x + w / 2, z0, z0 + d);

  return cabs;
}
