/**
 * Молекуланың мектеп деңгейіндегі талдауы (VSEPR / Гиллеспи теориясы):
 * бөлінбеген электрон жұптары және олардың бағыты, гибридтену, δ+/δ− зарядтар, диполь, байланыс түрлері.
 * shortcut: гибридтену тек «көрші саны + бөлінбеген жұп» бойынша — амидтегі N сияқты қосарланған жүйелерде sp³ шығады (шын мәнінде sp²).
 */
import { getElement } from "./elements";
import type { MolGraph } from "./molfile";

export type Vec = { x: number; y: number; z: number };
export type Hybridization = "sp" | "sp2" | "sp3";
export type BondKind = "nonpolar" | "polar" | "ionic";

export type AtomAnalysis = {
  neighbors: number[];
  lonePairs: number;
  /** Бөлінбеген жұптардың бағыты (бірлік векторлар) */
  lonePairDirections: Vec[];
  hybridization: Hybridization | null;
  /** Шартты ішінара заряд: оң — δ+, теріс — δ− */
  partialCharge: number;
};

const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const scale = (a: Vec, k: number): Vec => ({ x: a.x * k, y: a.y * k, z: a.z * k });
const dot = (a: Vec, b: Vec) => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Vec, b: Vec): Vec => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
export const length = (a: Vec) => Math.hypot(a.x, a.y, a.z);
const normalize = (a: Vec): Vec => scale(a, 1 / (length(a) || 1));

/** v-ға перпендикуляр бірлік вектор (hint берілсе — соның v-ға перпендикуляр құраушысы) */
function perpendicular(v: Vec, hint?: Vec): Vec {
  if (hint) {
    const p = sub(hint, scale(v, dot(hint, v)));
    if (length(p) > 1e-3) return normalize(p);
  }
  const axis = Math.abs(v.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  return normalize(cross(v, axis));
}

/** Негізгі топша элементтерінің валенттік электрондары: 1, 2-топ → 1, 2; 13–18-топ → топ − 10 */
export function valenceElectrons(elem: string): number | null {
  const e = getElement(elem);
  if (!e?.group) return null;
  if (e.group <= 2) return e.group;
  if (e.group >= 13) return e.number === 2 ? 2 : e.group - 10;
  return null;
}

const DEG = Math.PI / 180;

/** Бөлінбеген жұптардың бағыты: байланыстардан барынша алыс (VSEPR) */
function lonePairDirections(bonds: Vec[], count: number, planeHint?: Vec): Vec[] {
  if (!count || !bonds.length) return [];
  const sum = bonds.reduce(add, { x: 0, y: 0, z: 0 });
  const away = length(sum) > 1e-3 ? normalize(scale(sum, -1)) : perpendicular(bonds[0]);
  if (count === 1) return [away];
  if (count === 2 && bonds.length >= 2) {
    // Судағыдай: екі жұп H–O–H жазықтығына перпендикуляр жазықтықта, бір-бірінен ≈109,5°
    let n = cross(bonds[0], bonds[1]);
    n = length(n) > 1e-3 ? normalize(n) : perpendicular(away);
    const half = (109.5 / 2) * DEG;
    return [add(scale(away, Math.cos(half)), scale(n, Math.sin(half))), add(scale(away, Math.cos(half)), scale(n, -Math.sin(half)))];
  }
  if (count === 2) {
    // Шеткі атом, қос байланыс (C=O): жұптар байланыстан 120°, молекула жазықтығында
    const p = perpendicular(bonds[0], planeHint);
    const back = scale(bonds[0], -Math.cos(60 * DEG));
    return [add(back, scale(p, Math.sin(60 * DEG))), add(back, scale(p, -Math.sin(60 * DEG)))];
  }
  // Үш жұп (HCl-дағы Cl): байланыстан 109,5°, өзара 120°
  const u = perpendicular(away);
  const v = cross(away, u);
  const tilt = (180 - 109.5) * DEG;
  return [0, 120, 240].map((phi) =>
    normalize(add(scale(away, Math.cos(tilt)), add(scale(u, Math.sin(tilt) * Math.cos(phi * DEG)), scale(v, Math.sin(tilt) * Math.sin(phi * DEG))))),
  );
}

// Ішінара зарядтың шартты моделі: әр байланыс үшін электртерістік айырмасының жартысы + формалды зарядтың 0,3 бөлігі
const EN_SHARE = 0.5;
const FORMAL_SHARE = 0.3;
/** Осыдан кіші |μ| (заряд·Å) — полюссіз молекула */
export const POLAR_THRESHOLD = 0.12;

export function analyzeMolecule(graph: MolGraph) {
  const { atoms, bonds } = graph;
  const neighbors = atoms.map(() => [] as number[]);
  const orderSum = atoms.map(() => 0);
  for (const { a, b, order } of bonds) {
    neighbors[a].push(b);
    neighbors[b].push(a);
    orderSum[a] += order;
    orderSum[b] += order;
  }
  const en = atoms.map((a) => getElement(a.elem)?.electronegativity ?? null);

  const analysis: AtomAnalysis[] = atoms.map((atom, i) => {
    const valence = valenceElectrons(atom.elem);
    const lonePairs = valence === null || !neighbors[i].length ? 0 : Math.max(0, Math.floor((valence - atom.charge - orderSum[i]) / 2));
    const bondVectors = neighbors[i].map((j) => normalize(sub(atoms[j], atom)));
    // Шеткі атомның жұптары көршінің басқа байланыстары жатқан жазықтықта болсын
    const other = neighbors[i].length === 1 ? neighbors[neighbors[i][0]].find((k) => k !== i) : undefined;
    const planeHint = other === undefined ? undefined : sub(atoms[other], atoms[neighbors[i][0]]);
    const steric = neighbors[i].length + lonePairs;
    const hybridization = atom.elem !== "H" && neighbors[i].length >= 2 && steric >= 2 && steric <= 4 ? (["sp", "sp2", "sp3"] as const)[steric - 2] : null;
    let partialCharge = atom.charge * FORMAL_SHARE;
    for (const j of neighbors[i]) if (en[i] !== null && en[j] !== null) partialCharge += (en[j]! - en[i]!) * EN_SHARE;
    return { neighbors: neighbors[i], lonePairs, lonePairDirections: lonePairDirections(bondVectors, lonePairs, planeHint), hybridization, partialCharge };
  });

  // Диполь μ = Σ qᵢ·rᵢ (оң зарядқа қарай бағытталған)
  const dipole = atoms.reduce((sum, atom, i) => add(sum, scale(atom, analysis[i].partialCharge)), { x: 0, y: 0, z: 0 });
  return { atoms: analysis, dipole, polar: length(dipole) > POLAR_THRESHOLD };
}

/** Электртерістік айырмасы бойынша байланыс түрі: < 0,4 — полюссіз ковалентті, < 1,7 — полюсті ковалентті, әйтпесе иондық */
export function bondKind(deltaEn: number): BondKind {
  return deltaEn < 0.4 ? "nonpolar" : deltaEn < 1.7 ? "polar" : "ionic";
}

// Жұптың әдеттегі жазылуы: C алдымен (C–H, C–O), O/N-мен H соңында (O–H, N–H), қалғаны — электртерістігі өсу ретімен (H–Cl, S–O)
function pairRank(x: string, other: string) {
  if (x === "C") return -10;
  if (x === "H" && (other === "O" || other === "N")) return 10;
  return getElement(x)?.electronegativity ?? 0;
}

/** Молекуладағы байланыс түрлері (қайталанбайтын жұптар): [{ pair: "O–H", delta: 1.24, kind: "polar" }] */
export function bondTypes(graph: MolGraph) {
  const seen = new Map<string, { pair: string; delta: number; kind: BondKind }>();
  for (const { a, b } of graph.bonds) {
    const [p, q] = [graph.atoms[a].elem, graph.atoms[b].elem].sort((x, y) => pairRank(x, y) - pairRank(y, x));
    const key = `${p}–${q}`;
    if (seen.has(key)) continue;
    const delta = Math.abs((getElement(p)?.electronegativity ?? 0) - (getElement(q)?.electronegativity ?? 0));
    seen.set(key, { pair: key, delta: Math.round(delta * 100) / 100, kind: bondKind(delta) });
  }
  return [...seen.values()];
}

/** Үш нүкте арасындағы бұрыш (градус), ортасы — b */
export function angleBetween(a: Vec, b: Vec, c: Vec) {
  const u = normalize(sub(a, b));
  const v = normalize(sub(c, b));
  return Math.acos(Math.min(1, Math.max(-1, dot(u, v)))) / DEG;
}

export const distance = (a: Vec, b: Vec) => length(sub(a, b));

/** Сутектік байланыстар: байланыспаған H···O/N/F жұптары 1,5–2,2 Å қашықтықта (мұз кристалы үшін) */
export function hydrogenBonds(graph: MolGraph) {
  const bonded = new Set(graph.bonds.flatMap(({ a, b }) => [`${a}-${b}`, `${b}-${a}`]));
  const pairs: [number, number][] = [];
  graph.atoms.forEach((h, i) => {
    if (h.elem !== "H") return;
    graph.atoms.forEach((acceptor, j) => {
      if (!["O", "N", "F"].includes(acceptor.elem) || bonded.has(`${i}-${j}`)) return;
      const d = distance(h, acceptor);
      if (d > 1.5 && d < 2.2) pairs.push([i, j]);
    });
  });
  return pairs;
}
