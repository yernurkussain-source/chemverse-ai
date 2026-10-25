// SDF (molfile) → GLB: AR үшін молекуланың «шар-таяқша» 3D моделін жасайды.
// Іске қосу: npm run glb   (нәтиже: public/molecules/glb/<id>.glb)
//
// Модель метрмен өлшенеді: ең үлкен өлшемі ~22 см болатындай масштабталады (үстелге ыңғайлы).
// Түстер — CPK: H ақ, C сұр, N көк, O қызыл, S сары, P қызғылт сары, Cl жасыл, Na күлгін, Fe/Cu — металл реңктері.
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

const SRC = join("public", "molecules", "sdf");
const OUT = join("public", "molecules", "glb");
const TARGET_SIZE_M = 0.22;

const ELEMENT_STYLE = {
  H: { color: 0xffffff, radius: 0.28 },
  C: { color: 0x909090, radius: 0.4 },
  N: { color: 0x3050f8, radius: 0.39 },
  O: { color: 0xff0d0d, radius: 0.38 },
  S: { color: 0xffff30, radius: 0.5 },
  P: { color: 0xff8000, radius: 0.5 },
  Fe: { color: 0xe06633, radius: 0.5 },
  Cu: { color: 0xc88033, radius: 0.5 },
  Na: { color: 0xab5cf2, radius: 0.55 },
  Cl: { color: 0x1ff01f, radius: 0.62 },
};
const FALLBACK = { color: 0xff1493, radius: 0.4 };
const BOND_RADIUS = 0.1;

// GLTFExporter бинарлық файлды браузердегі FileReader арқылы жинайды — Node.js-те қарапайым нұсқасы
globalThis.FileReader ??= class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = buffer;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
  readAsDataURL(blob) {
    blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type || "application/octet-stream"};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onload?.({ target: this });
      this.onloadend?.({ target: this });
    });
  }
};

/** V2000 molfile: атомдар (белгі, x, y, z) және байланыстар (a, b, еселігі) */
function parseMolfile(text) {
  const lines = text.split(/\r?\n/);
  const atomCount = parseInt(lines[3].slice(0, 3), 10);
  const bondCount = parseInt(lines[3].slice(3, 6), 10);
  const atoms = [];
  for (let i = 0; i < atomCount; i++) {
    const l = lines[4 + i];
    atoms.push({
      el: l.slice(31, 34).trim(),
      pos: new THREE.Vector3(parseFloat(l.slice(0, 10)), parseFloat(l.slice(10, 20)), parseFloat(l.slice(20, 30))),
    });
  }
  const bonds = [];
  for (let i = 0; i < bondCount; i++) {
    const l = lines[4 + atomCount + i];
    bonds.push({ a: parseInt(l.slice(0, 3), 10) - 1, b: parseInt(l.slice(3, 6), 10) - 1, order: parseInt(l.slice(6, 9), 10) });
  }
  return { atoms, bonds };
}

function buildScene({ atoms, bonds }, name) {
  const group = new THREE.Group();
  group.name = name;

  // Ортақ геометрия (өлшемі scale арқылы) — файл кішкентай болады
  const sphere = new THREE.SphereGeometry(1, 32, 16);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  const materials = new Map();
  const material = (color) => {
    if (!materials.has(color)) {
      materials.set(color, new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.05 }));
    }
    return materials.get(color);
  };

  const center = new THREE.Vector3();
  atoms.forEach((a) => center.add(a.pos));
  center.divideScalar(atoms.length);

  // Байланысы жоқ кристалда (NaCl) шарлар үлкенірек
  const sphereScale = bonds.length ? 1 : 1.3;
  for (const atom of atoms) {
    const style = ELEMENT_STYLE[atom.el] ?? FALLBACK;
    const mesh = new THREE.Mesh(sphere, material(style.color));
    mesh.name = atom.el;
    mesh.position.copy(atom.pos).sub(center);
    mesh.scale.setScalar(style.radius * sphereScale);
    group.add(mesh);
  }

  const up = new THREE.Vector3(0, 1, 0);
  const bondMaterial = material(0xb4bccc);
  for (const bond of bonds) {
    const a = atoms[bond.a].pos.clone().sub(center);
    const b = atoms[bond.b].pos.clone().sub(center);
    const dir = b.clone().sub(a);
    const length = dir.length();
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize());
    // Қос/үш байланыс — бір-біріне параллель бірнеше цилиндр
    const order = Math.min(bond.order, 3);
    let side = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 0, 1));
    if (side.lengthSq() < 1e-6) side = new THREE.Vector3(0, 1, 0);
    side.normalize();
    const radius = order === 1 ? BOND_RADIUS : BOND_RADIUS * 0.7;
    const offsets = order === 1 ? [0] : order === 2 ? [-0.13, 0.13] : [-0.2, 0, 0.2];
    for (const offset of offsets) {
      const mesh = new THREE.Mesh(cylinder, bondMaterial);
      mesh.name = "bond";
      mesh.position.copy(mid).addScaledVector(side, offset);
      mesh.quaternion.copy(quaternion);
      mesh.scale.set(radius, length, radius);
      group.add(mesh);
    }
  }

  // Ангстремнен метрге: ең үлкен өлшемі TARGET_SIZE_M болсын
  const size = new THREE.Box3().setFromObject(group).getSize(new THREE.Vector3());
  group.scale.setScalar(TARGET_SIZE_M / Math.max(size.x, size.y, size.z));

  const scene = new THREE.Scene();
  scene.add(group);
  return scene;
}

async function toGlb(scene) {
  const exporter = new GLTFExporter();
  const result = await exporter.parseAsync(scene, { binary: true });
  return Buffer.from(result);
}

mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(SRC).filter((f) => f.endsWith(".sdf"))) {
  const id = basename(file, ".sdf");
  const molecule = parseMolfile(readFileSync(join(SRC, file), "utf8"));
  const glb = await toGlb(buildScene(molecule, id));
  const target = join(OUT, `${id}.glb`);
  writeFileSync(target, glb);
  console.log(`${id.padEnd(9)} ${molecule.atoms.length} атом, ${molecule.bonds.length} байланыс → ${target} (${(statSync(target).size / 1024).toFixed(0)} КБ)`);
}
