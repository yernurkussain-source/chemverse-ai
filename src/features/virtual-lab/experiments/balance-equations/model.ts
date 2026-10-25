import { parseFormula } from "@/lib/chemistry/formula";

/**
 * «Коэффициенттерді таңдау» моделі (8-сынып) — таза функциялар.
 * Оқушы әр заттың алдына коэффициент қояды; модель екі жақтағы атомдарды санайды («атом таразысы»).
 * Теңестірілді = әр элементтің атом саны екі жақта бірдей және коэффициенттер ең кіші бүтін сандар (ЕҮОБ = 1).
 */
export const EQUATIONS = [
  { id: "water", left: ["H₂", "O₂"], right: ["H₂O"] },
  { id: "magnesium", left: ["Mg", "O₂"], right: ["MgO"] },
  { id: "iron", left: ["Fe", "HCl"], right: ["FeCl₂", "H₂"] },
  { id: "aluminium", left: ["Al", "O₂"], right: ["Al₂O₃"] },
  { id: "methane", left: ["CH₄", "O₂"], right: ["CO₂", "H₂O"] },
] as const;
export type EquationId = (typeof EQUATIONS)[number]["id"];

export const COEFF_MIN = 1;
export const COEFF_MAX = 9;

const termsOf = (i: number) => [...EQUATIONS[i].left, ...EQUATIONS[i].right];
export const termCount = (i: number) => termsOf(i).length;
export const initialCoefficients = (i: number) => termsOf(i).map(() => 1);

type Counts = Record<string, number>;

/** Екі жақтағы атомдар: { left: { H: 4, O: 2 }, right: { H: 4, O: 2 } } */
export function atomCounts(i: number, coeffs: readonly number[]) {
  const { left } = EQUATIONS[i];
  const sides: { left: Counts; right: Counts } = { left: {}, right: {} };
  termsOf(i).forEach((formula, k) => {
    const side = k < left.length ? sides.left : sides.right;
    for (const [el, n] of Object.entries(parseFormula(formula) ?? {})) side[el] = (side[el] ?? 0) + n * (coeffs[k] ?? 1);
  });
  return sides;
}

/** Теңдеудегі элементтер (сол жақтағы реті бойынша) */
export const elementsOf = (i: number) => Object.keys(atomCounts(i, initialCoefficients(i)).left);

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export function isBalanced(i: number, coeffs: readonly number[]) {
  if (coeffs.length !== termCount(i) || coeffs.some((c) => !Number.isInteger(c) || c < COEFF_MIN || c > COEFF_MAX)) return false;
  const { left, right } = atomCounts(i, coeffs);
  const same = elementsOf(i).every((el) => left[el] === right[el]);
  return same && coeffs.reduce(gcd) === 1;
}

/** Бір жақтағы атомдардың жалпы саны */
export const totalAtoms = (counts: Counts) => Object.values(counts).reduce((a, b) => a + b, 0);

/** Теңдеудің мәтіні: «2H₂ + O₂ → 2H₂O» (коэффициент 1 жазылмайды) */
export function equationText(i: number, coeffs: readonly number[]) {
  const { left, right } = EQUATIONS[i];
  const term = (f: string, k: number) => `${coeffs[k] > 1 ? coeffs[k] : ""}${f}`;
  return `${left.map((f, k) => term(f, k)).join(" + ")} → ${right.map((f, k) => term(f, left.length + k)).join(" + ")}`;
}
