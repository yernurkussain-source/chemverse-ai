/**
 * Молекула құрастырушының логикасы: торға атом қою, байланыс еселігі, валенттілік, сутекпен толтыру
 * және құрастырылған графты платформадағы молекулалармен салыстыру (изомерлер ажыратылады).
 */
import type { MolGraph } from "./molfile";

export type BuilderAtom = { id: number; elem: string; x: number; y: number };
export type BuilderBond = { a: number; b: number; order: number };
export type BuilderState = { atoms: BuilderAtom[]; bonds: BuilderBond[]; nextId: number };

export const PALETTE = ["H", "C", "N", "O", "S", "Cl"] as const;
/** Мектептегі валенттілік (күкірт — II, IV, VI) */
export const VALENCES: Record<string, number[]> = { H: [1], C: [4], N: [3], O: [2], S: [2, 4, 6], Cl: [1] };
export const GRID = { width: 9, height: 6 };
export const EMPTY: BuilderState = { atoms: [], bonds: [], nextId: 1 };

// Көрші торлар: алдымен оң/төмен/жоғары/сол, сосын диагональдар
const DIRECTIONS = [
  [1, 0],
  [0, 1],
  [0, -1],
  [-1, 0],
  [1, 1],
  [1, -1],
  [-1, 1],
  [-1, -1],
];

export const bondSum = (state: BuilderState, id: number) =>
  state.bonds.reduce((sum, b) => sum + (b.a === id || b.b === id ? b.order : 0), 0);

/** Бос валенттілік: ең жақын рұқсат етілген мәнге дейін (S-те 3 байланыс → тағы 1); асып кетсе — теріс */
export function freeValence(state: BuilderState, atom: BuilderAtom) {
  const used = bondSum(state, atom.id);
  const target = VALENCES[atom.elem].find((v) => v >= used);
  return target === undefined ? VALENCES[atom.elem].at(-1)! - used : target - used;
}

const occupied = (state: BuilderState, x: number, y: number) => state.atoms.some((a) => a.x === x && a.y === y);
const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < GRID.width && y < GRID.height;

function freeCellNear(state: BuilderState, x: number, y: number) {
  for (const [dx, dy] of DIRECTIONS) if (inside(x + dx, y + dy) && !occupied(state, x + dx, y + dy)) return { x: x + dx, y: y + dy };
  return null;
}

/** Атом қосу: таңдалған атом болса — қасына қойып, онымен байланыстырады; бос орын болмаса — null */
export function addAtom(state: BuilderState, elem: string, selected: number | null): { state: BuilderState; id: number } | null {
  const anchor = state.atoms.find((a) => a.id === selected);
  let cell = anchor ? freeCellNear(state, anchor.x, anchor.y) : null;
  if (!anchor) {
    const center = { x: Math.floor(GRID.width / 2) - 1, y: Math.floor(GRID.height / 2) };
    cell = occupied(state, center.x, center.y) ? freeCellNear(state, center.x, center.y) : center;
    // Орталық толы болса — кез келген бос тор
    for (let y = 0; !cell && y < GRID.height; y++) for (let x = 0; !cell && x < GRID.width; x++) if (!occupied(state, x, y)) cell = { x, y };
  }
  if (!cell) return null;
  const id = state.nextId;
  const atoms = [...state.atoms, { id, elem, ...cell }];
  const bonds = anchor ? [...state.bonds, { a: anchor.id, b: id, order: 1 }] : state.bonds;
  return { state: { atoms, bonds, nextId: id + 1 }, id };
}

/** Екі атом арасындағы байланыс: жоқ → 1 → 2 → 3 → жоқ */
export function cycleBond(state: BuilderState, a: number, b: number): BuilderState {
  const index = state.bonds.findIndex((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  if (index === -1) return { ...state, bonds: [...state.bonds, { a, b, order: 1 }] };
  const order = state.bonds[index].order;
  const bonds = order >= 3 ? state.bonds.filter((_, i) => i !== index) : state.bonds.map((x, i) => (i === index ? { ...x, order: order + 1 } : x));
  return { ...state, bonds };
}

export function removeAtom(state: BuilderState, id: number): BuilderState {
  return { ...state, atoms: state.atoms.filter((a) => a.id !== id), bonds: state.bonds.filter((b) => b.a !== id && b.b !== id) };
}

/** Барлық бос валенттілікті сутекпен толтыру (қасында бос тор болса) */
export function fillHydrogens(state: BuilderState): BuilderState {
  let next = state;
  for (const atom of state.atoms) {
    if (atom.elem === "H") continue;
    for (let free = freeValence(next, atom); free > 0; free--) {
      const added = addAtom(next, "H", atom.id);
      if (!added) break;
      next = added.state;
    }
  }
  return next;
}

/** Бір ғана молекула ма (барлық атом байланысқан) */
export function isConnected(state: BuilderState) {
  if (!state.atoms.length) return false;
  const seen = new Set([state.atoms[0].id]);
  const stack = [state.atoms[0].id];
  while (stack.length) {
    const id = stack.pop()!;
    for (const b of state.bonds) {
      const other = b.a === id ? b.b : b.b === id ? b.a : null;
      if (other !== null && !seen.has(other)) {
        seen.add(other);
        stack.push(other);
      }
    }
  }
  return seen.size === state.atoms.length;
}

export function composition(state: BuilderState) {
  const atoms: Record<string, number> = {};
  for (const a of state.atoms) atoms[a.elem] = (atoms[a.elem] ?? 0) + 1;
  return atoms;
}

/**
 * Графтың «қолтаңбасы» (Вейсфейлер–Леман әдісі): әр атомның белгісі көршілерімен 4 рет жаңартылады.
 * Изоморфты графтарда бірдей; мектептегі шағын молекулаларда изомерлерді ажыратады (бутан ≠ изобутан).
 */
export function signature(graph: Pick<MolGraph, "bonds"> & { atoms: { elem: string }[] }) {
  let labels = graph.atoms.map((a) => a.elem);
  for (let round = 0; round < 4; round++) {
    labels = labels.map((label, i) => {
      const around = graph.bonds
        .filter((b) => b.a === i || b.b === i)
        .map((b) => `${b.order}${labels[b.a === i ? b.b : b.a]}`)
        .sort()
        .join(",");
      // Белгі тым ұзарып кетпеуі үшін хэшпен қысқартамыз (барлық графта бірдей — салыстыруға болады)
      return `${graph.atoms[i].elem}${hash(`${label}(${around})`)}`;
    });
  }
  return [...labels].sort().join("|");
}

/** FNV-1a 32 бит, 36-лық жүйеде */
function hash(text: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

/** Құрастырушы күйін signature() үшін графқа айналдыру (атом id → индекс) */
export function toGraph(state: BuilderState) {
  const index = new Map(state.atoms.map((a, i) => [a.id, i]));
  return { atoms: state.atoms.map((a) => ({ elem: a.elem })), bonds: state.bonds.map((b) => ({ a: index.get(b.a)!, b: index.get(b.b)!, order: b.order })) };
}
