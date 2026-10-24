import * as THREE from "three";
import { ROOM, type Base } from "../core/context";
import { boxG, canvasTex, std } from "../core/three-utils";

/** Бөлме: еден, төбе, қабырғалар, төбедегі шамдар, терезе, плакаттар (қауіпсіздік ережелері, периодтық жүйе) */
export function buildRoom(G: Base): void {
  const { mesh, tr } = G;

  const floorTex = canvasTex(
    256,
    256,
    (x, w, h) => {
      x.fillStyle = "#b9c3cd";
      x.fillRect(0, 0, w, h);
      x.fillStyle = "#a9b4c0";
      x.fillRect(0, 0, 128, 128);
      x.fillRect(128, 128, 128, 128);
      x.strokeStyle = "#b3bac3";
      x.lineWidth = 2;
      x.strokeRect(0, 0, w, h);
      x.beginPath();
      x.moveTo(128, 0);
      x.lineTo(128, h);
      x.moveTo(0, 128);
      x.lineTo(w, 128);
      x.stroke();
    },
    [9, 6.6],
  );
  mesh(new THREE.PlaneGeometry(9, 6.6), std(0xffffff, { map: floorTex, r: 0.55 }), 0, 0, 0, null, { cast: false }).rotation.x =
    -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(9, 6.6), std(0xf3f5f8, { r: 0.9 }), 0, ROOM.h, 0, null, { cast: false, recv: false }).rotation.x =
    Math.PI / 2;

  const wallTex = canvasTex(512, 512, (x, w, h) => {
    x.fillStyle = "#e9edf1";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#bcd6dc";
    x.fillRect(0, h * 0.62, w, h * 0.38);
    x.fillStyle = "#7fa9b3";
    x.fillRect(0, h * 0.615, w, 6);
  });
  const wall = (w: number, x: number, z: number, ry: number) => {
    const m = mesh(new THREE.PlaneGeometry(w, ROOM.h), std(0xffffff, { map: wallTex, r: 0.85 }), x, ROOM.h / 2, z, null, { cast: false });
    m.rotation.y = ry;
  };
  wall(9, 0, ROOM.z0, 0);
  wall(9, 0, ROOM.z1, Math.PI);
  wall(6.6, ROOM.x0, 0, Math.PI / 2);
  wall(6.6, ROOM.x1, 0, -Math.PI / 2);

  // Төбедегі шам панельдері
  for (const [x, z] of [
    [-2, -1],
    [2, -1],
    [-2, 1.6],
    [2, 1.6],
    [0, 0.3],
  ]) {
    mesh(boxG(1.2, 0.03, 0.6), std(0xffffff, { e: 0xffffff, ei: 0.9 }), x, ROOM.h - 0.02, z, null, { cast: false, recv: false });
  }

  // Терезе (оң жақ қабырға) және оның жақтаулары
  const winTex = canvasTex(256, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#8ec5f0");
    g.addColorStop(0.7, "#d8ecfb");
    g.addColorStop(1, "#e9f3e2");
    x.fillStyle = g;
    x.fillRect(0, 0, w, h);
    x.fillStyle = "rgba(255,255,255,.7)";
    x.beginPath();
    x.ellipse(70, 60, 40, 14, 0, 0, 7);
    x.ellipse(170, 90, 52, 16, 0, 0, 7);
    x.fill();
  });
  mesh(new THREE.PlaneGeometry(2.4, 1.3), new THREE.MeshBasicMaterial({ map: winTex }), ROOM.x1 - 0.01, 1.75, 0.3, null, {
    cast: false,
    recv: false,
  }).rotation.y = -Math.PI / 2;
  for (const [y, w, h, d] of [
    [1.75, 0.06, 1.4, 2.5],
    [1.75, 0.06, 0.06, 2.5],
    [1.75, 0.06, 1.4, 0.06],
    [1.08, 0.12, 0.04, 2.6],
  ]) {
    mesh(boxG(w, h, d), std(0xf6f7f9, { r: 0.5 }), ROOM.x1 - 0.03, y, 0.3, null, { cast: false });
  }

  const poster = (
    x: number,
    y: number,
    z: number,
    ry: number,
    w: number,
    h: number,
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
  ) => {
    const m = mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({ map: canvasTex(512, Math.round((512 * h) / w), draw), roughness: 0.8 }),
      x,
      y,
      z,
      null,
      { cast: false },
    );
    m.rotation.y = ry;
  };

  // Мәтін ұзын болса, fillText-тің 4-параметрі (maxWidth) оны сыйдырады — үш тілде де шықпай қалмайды
  poster(ROOM.x0 + 0.01, 1.55, -1.2, Math.PI / 2, 0.9, 1.2, (x, w, h) => {
    x.fillStyle = "#fffdf6";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#d62828";
    x.fillRect(0, 0, w, 90);
    x.fillStyle = "#fff";
    x.font = "bold 40px Arial";
    x.textAlign = "center";
    x.fillText(tr("scene.safetyTitle").toUpperCase(), w / 2, 60, w - 24);
    x.fillStyle = "#1b1b1b";
    x.textAlign = "left";
    x.font = "26px Arial";
    for (let i = 0; i < 6; i++) x.fillText(tr(`scene.safety${i + 1}`), 34, 160 + i * 72, w - 50);
  });

  poster(ROOM.x1 - 0.01, 1.6, -1.9, -Math.PI / 2, 1.6, 0.95, (x, w, h) => {
    x.fillStyle = "#f8fafc";
    x.fillRect(0, 0, w, h);
    x.fillStyle = "#0b1530";
    x.font = "bold 22px Arial";
    x.fillText(tr("scene.periodicTitle").toUpperCase(), 14, 26, w - 28);
    const S = ["H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar"];
    S.push("K", "Ca", "Sc", "Ti", "V", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Ga", "Ge", "As", "Se", "Br", "Kr");
    const pos: [number, number][] = [
      [0, 0],
      [0, 17],
    ];
    for (let i = 0; i < 2; i++) pos.push([1, i]);
    for (let i = 0; i < 6; i++) pos.push([1, 12 + i]);
    for (let i = 0; i < 2; i++) pos.push([2, i]);
    for (let i = 0; i < 6; i++) pos.push([2, 12 + i]);
    for (let i = 0; i < 18; i++) pos.push([3, i]);
    const cw = (w - 20) / 18;
    const ch = 48;
    S.forEach((s, i) => {
      const [r, c] = pos[i];
      x.fillStyle = c < 2 ? "#ffd6a5" : c > 11 ? (c === 17 ? "#bde0fe" : "#caffbf") : "#ffadad";
      x.fillRect(10 + c * cw, 40 + r * (ch + 4), cw - 3, ch);
      x.fillStyle = "#111";
      x.font = "bold 18px Arial";
      x.textAlign = "center";
      x.fillText(s, 10 + c * cw + cw / 2, 40 + r * (ch + 4) + 30);
      x.font = "10px Arial";
      x.fillText(String(i + 1), 10 + c * cw + cw / 2, 40 + r * (ch + 4) + 12);
      x.textAlign = "left";
    });
  });
}
