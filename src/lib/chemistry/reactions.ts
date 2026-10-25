/** Анимацияланған реакциялар: коэффициенттерімен (атомдар саны екі жақта бірдей — тест тексереді) */
import { getMolecule, type MoleculeId } from "./molecules";

export type ReactionId = "water" | "hcl" | "ammonia" | "methane-burning" | "ethanol-burning" | "hydrogenation";
export type Reaction = { id: ReactionId; reactants: [MoleculeId, number][]; products: [MoleculeId, number][] };

export const REACTIONS: Reaction[] = [
  { id: "water", reactants: [["h2", 2], ["o2", 1]], products: [["h2o", 2]] },
  { id: "hcl", reactants: [["h2", 1], ["cl2", 1]], products: [["hcl", 2]] },
  { id: "ammonia", reactants: [["n2", 1], ["h2", 3]], products: [["nh3", 2]] },
  { id: "methane-burning", reactants: [["ch4", 1], ["o2", 2]], products: [["co2", 1], ["h2o", 2]] },
  { id: "ethanol-burning", reactants: [["ethanol", 1], ["o2", 3]], products: [["co2", 2], ["h2o", 3]] },
  { id: "hydrogenation", reactants: [["ethylene", 1], ["h2", 1]], products: [["ethane", 1]] },
];

/** Бір жақтағы атомдар саны: { H: 4, O: 2 } */
export function sideAtoms(side: Reaction["reactants"]) {
  const total: Record<string, number> = {};
  for (const [id, n] of side) for (const [el, k] of Object.entries(getMolecule(id)!.atoms)) total[el] = (total[el] ?? 0) + k * n;
  return total;
}

/** Теңдеу мәтіні: "2H₂ + O₂ → 2H₂O" */
export function equation(reaction: Reaction) {
  const side = (items: Reaction["reactants"]) => items.map(([id, n]) => `${n > 1 ? n : ""}${getMolecule(id)!.formula}`).join(" + ");
  return `${side(reaction.reactants)} → ${side(reaction.products)}`;
}

export type PlacedAtom = { elem: string; x: number; y: number; z: number };
type Graph = { atoms: PlacedAtom[]; bonds: { a: number; b: number; order: number }[] };

/** Молекулаларды x осі бойымен қатар қою: әрқайсысы өз центріне келтіріледі, қатар ортасы — координат басы */
export function layoutRow(graphs: Graph[], gap = 1.2): Graph {
  const atoms: PlacedAtom[] = [];
  const bonds: Graph["bonds"] = [];
  let cursor = 0;
  for (const g of graphs) {
    const c = g.atoms.reduce((s, a) => ({ x: s.x + a.x / g.atoms.length, y: s.y + a.y / g.atoms.length, z: s.z + a.z / g.atoms.length }), { x: 0, y: 0, z: 0 });
    const xs = g.atoms.map((a) => a.x - c.x);
    const left = Math.min(...xs);
    const offset = atoms.length;
    g.atoms.forEach((a, i) => atoms.push({ elem: a.elem, x: cursor - left + xs[i], y: a.y - c.y, z: a.z - c.z }));
    g.bonds.forEach((b) => bonds.push({ a: b.a + offset, b: b.b + offset, order: b.order }));
    cursor += Math.max(...xs) - left + gap;
  }
  const shift = (cursor - gap) / 2;
  atoms.forEach((a) => (a.x -= shift));
  return { atoms, bonds };
}

/** Реагент атомдарын өнім атомдарына сәйкестендіру: әр элемент ішінде x бойынша реттеп жұптаймыз (атомдар қиылыспай жылжиды) */
export function mapAtoms(from: PlacedAtom[], to: PlacedAtom[]) {
  const target = new Array<number>(from.length);
  for (const elem of new Set(from.map((a) => a.elem))) {
    const order = (list: PlacedAtom[]) => list.map((a, i) => [a, i] as const).filter(([a]) => a.elem === elem).sort((p, q) => p[0].x - q[0].x).map(([, i]) => i);
    const [src, dst] = [order(from), order(to)];
    src.forEach((i, k) => (target[i] = dst[k]));
  }
  return target;
}
