import { addLiquid, METAL, newVessel, step, type Ions } from "@/features/chem-engine";

/**
 * «Металдардың белсенділігі» моделі (9-сынып) — таза функциялар.
 * 4 металл × 3 ерітінді = 12 пробирка. Реакцияны ортақ химия қозғалтқышы 60 с бойы есептейді (3D зертханамен бірдей):
 * металл + H⁺ (сутек бөлінеді), ығыстыру: металл + Cu²⁺ → мыс қабаты, металл + Ag⁺ → күміс қабаты.
 * Әділ салыстыру үшін әр кесек бірдей — 0,1 г (3D-да кесектердің массасы әртүрлі).
 */
export const METALS = ["Mg", "Zn", "Fe", "Cu"] as const;
export type MetalId = (typeof METALS)[number];

export const SOLUTIONS = [
  { id: "HCl", f: "HCl", ions: { H: 1, Cl: 1 } },
  { id: "CuSO4", f: "CuSO₄", ions: { Cu: 0.5, SO4: 0.5 } },
  { id: "AgNO3", f: "AgNO₃", ions: { Ag: 0.1, NO3: 0.1 } },
] as const satisfies readonly { id: string; f: string; ions: Ions }[];

export const PIECE_G = 0.1;
export const VOLUME_ML = 10;
export const TIME_S = 60;
/** Газдың молярлық көлемі, мл/моль (spec 5.4-тегідей: 24 л/моль) */
export const VM_ML = 24000;
const DT = 0.5;

/** Пробирка нөмірі: металл × 3 + ерітінді (0…11) */
export const CELLS = METALS.flatMap((metal) => SOLUTIONS.map((_, solution) => ({ metal, solution })));

/** Байқалатын өзгеріс: газ көлемі (мл), бетіне қонған мыс / күміс (металдың үлесі, 0…1) */
export type TubeResult = { h2Ml: number; coat: "Cu" | "Ag" | null; reacted: number };

/** Бетке қонған металл «көрінеді» деп есептелетін шек (моль) */
const COAT_VISIBLE = 1e-5;

export function runTube(cell: number): TubeResult {
  const { metal, solution } = CELLS[cell];
  const v = newVessel("tube", 20, "tube");
  addLiquid(v, SOLUTIONS[solution].ions, VOLUME_ML);
  const n = PIECE_G / METAL[metal].M;
  v.pieces.push({ metal, n, n0: n, coatCu: 0, coatAg: 0 });
  for (let t = 0; t < TIME_S; t += DT) step(v, DT, false);
  const piece = v.pieces[0];
  const coat = piece.coatCu > COAT_VISIBLE ? "Cu" : piece.coatAg > COAT_VISIBLE ? "Ag" : null;
  return { h2Ml: Math.round((v.gasOut?.H2 ?? 0) * VM_ML * 10) / 10, coat, reacted: 1 - piece.n / n };
}

/** Реакция жүрді ме (газ не бетке қонған металл) */
export const reacted = (r: TubeResult) => r.h2Ml > 0.1 || r.coat !== null;

/** Әр металл неше ерітіндімен әрекеттесті және белсенділік орны (1 — ең белсенді, HCl-дағы газ көлемі бойынша) */
export function metalSummary() {
  const results = CELLS.map((_, i) => runTube(i));
  const byMetal = METALS.map((metal, m) => {
    const own = results.slice(m * SOLUTIONS.length, (m + 1) * SOLUTIONS.length);
    return { metal, reactions: own.filter(reacted).length, h2Ml: own[0].h2Ml };
  });
  const order = [...byMetal].sort((a, b) => b.h2Ml - a.h2Ml || b.reactions - a.reactions).map((s) => s.metal);
  return byMetal.map((s) => ({ ...s, rank: order.indexOf(s.metal) + 1 }));
}

export const testedCells = (tested: readonly number[]) => new Set(tested).size;
