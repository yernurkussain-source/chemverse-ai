/**
 * «Атом моделін құрастыру» (docs/chemlab/CHEMLAB_SPEC.md 5.2) — таза функциялар.
 * Бұл — оқу моделі (Бор моделі): нақты электрон бұлты басқаша.
 */

/** Z = 1…20: белгі және ең көп таралған изотоптың нейтрон саны (spec кестесі) */
export const ATOM_ELEMENTS = [
  { z: 1, symbol: "H", n: 0 },
  { z: 2, symbol: "He", n: 2 },
  { z: 3, symbol: "Li", n: 4 },
  { z: 4, symbol: "Be", n: 5 },
  { z: 5, symbol: "B", n: 6 },
  { z: 6, symbol: "C", n: 6 },
  { z: 7, symbol: "N", n: 7 },
  { z: 8, symbol: "O", n: 8 },
  { z: 9, symbol: "F", n: 10 },
  { z: 10, symbol: "Ne", n: 10 },
  { z: 11, symbol: "Na", n: 12 },
  { z: 12, symbol: "Mg", n: 12 },
  { z: 13, symbol: "Al", n: 14 },
  { z: 14, symbol: "Si", n: 14 },
  { z: 15, symbol: "P", n: 16 },
  { z: 16, symbol: "S", n: 16 },
  { z: 17, symbol: "Cl", n: 18 },
  { z: 18, symbol: "Ar", n: 22 },
  { z: 19, symbol: "K", n: 20 },
  { z: 20, symbol: "Ca", n: 20 },
] as const;

export const LIMITS = { p: 20, n: 30, e: 22 } as const;

export type Particles = { p: number; n: number; e: number };

/** Құрастыру мақсаттары (тәжірибе қадамы): көміртек-12, Na⁺, Cl⁻ */
export const ATOM_GOALS = [
  { id: "carbon12", target: { p: 6, n: 6, e: 6 } },
  { id: "sodiumIon", target: { p: 11, n: 12, e: 10 } },
  { id: "chlorideIon", target: { p: 17, n: 18, e: 18 } },
] as const;
export type AtomGoalId = (typeof ATOM_GOALS)[number]["id"];

export const elementOf = (p: number) => ATOM_ELEMENTS.find((el) => el.z === p) ?? null;
export const massNumber = ({ p, n }: Particles) => p + n;
export const chargeOf = ({ p, e }: Particles) => p - e;

/** Электрондарды қабаттарға орналастыру (Z ≤ 20): 2, 8, 8, қалғаны */
export function shellsOf(electrons: number): number[] {
  const shells: number[] = [];
  let left = Math.max(0, Math.floor(electrons));
  for (const capacity of [2, 8, 8]) {
    if (left <= 0) break;
    const k = Math.min(capacity, left);
    shells.push(k);
    left -= k;
  }
  if (left > 0) shells.push(left);
  return shells;
}

/** Заряд жазуы: 0 → "0", +1 → "+", −2 → "2−" (Na⁺, O²⁻ сияқты) */
export function chargeLabel(charge: number) {
  if (charge === 0) return "0";
  const sign = charge > 0 ? "+" : "−";
  return Math.abs(charge) === 1 ? sign : `${Math.abs(charge)}${sign}`;
}

const SUPERSCRIPT: Record<string, string> = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹", "+": "⁺", "−": "⁻" };

/** Бөлшектің жазуы: «C», «Na⁺», «O²⁻»; протон жоқ болса — null */
export function particleSymbol(particles: Particles) {
  const element = elementOf(particles.p);
  if (!element) return null;
  const charge = chargeOf(particles);
  if (charge === 0) return element.symbol;
  return element.symbol + [...chargeLabel(charge)].map((ch) => SUPERSCRIPT[ch] ?? ch).join("");
}

export type AtomInfo = {
  element: (typeof ATOM_ELEMENTS)[number] | null;
  massNumber: number;
  charge: number;
  kind: "none" | "atom" | "cation" | "anion";
  shells: number[];
  /** Нейтрон саны ең көп таралған изотоппен бірдей ме */
  stableIsotope: boolean;
  symbol: string | null;
};

export function describe(particles: Particles): AtomInfo {
  const element = elementOf(particles.p);
  const charge = chargeOf(particles);
  return {
    element,
    massNumber: massNumber(particles),
    charge,
    kind: !element ? "none" : charge === 0 ? "atom" : charge > 0 ? "cation" : "anion",
    shells: shellsOf(particles.e),
    stableIsotope: Boolean(element && element.n === particles.n),
    symbol: particleSymbol(particles),
  };
}

export const sameParticles = (a: Particles, b: Particles) => a.p === b.p && a.n === b.n && a.e === b.e;

/** «2, 8, 1», «2 8 1», «2-8-1» → [2, 8, 1]; қате болса null */
export function parseShells(text: string): number[] | null {
  const parts = text.trim().split(/[^0-9]+/).filter(Boolean);
  if (!parts.length || parts.length > 4) return null;
  return parts.map(Number);
}

export const sameShells = (a: number[] | null, b: number[]) => Boolean(a && a.length === b.length && a.every((v, i) => v === b[i]));
