/**
 * «Массалық үлес» (9-сынып): берілген массалық үлесі бар үш ерітінді дайындау.
 * Оқушы тұздың массасы мен судың көлемін өзі есептеп өлшейді (су: ρ = 1 г/мл); модель араластырған соң w-ны көрсетеді.
 */
export const TASKS = [
  { id: "a", solute: "NaCl", mass: 50, w: 10 },
  { id: "b", solute: "sugar", mass: 200, w: 5 },
  { id: "c", solute: "NaCl", mass: 80, w: 15 },
] as const;

/** Дайындалған ерітінді: [тапсырма, тұз г, су мл] */
export type Prep = [number, number, number];

export const isPrep = (e: unknown): e is Prep =>
  Array.isArray(e) && e.length === 3 && Number.isInteger(e[0]) && e[0] >= 0 && e[0] < TASKS.length && [e[1], e[2]].every((n) => typeof n === "number" && n >= 0 && n <= 300);

/** Массалық үлес, % */
export const fraction = (solute: number, water: number) => (solute + water > 0 ? (100 * solute) / (solute + water) : 0);

/** Тапсырма орындалды: масса ±0,5 г, үлес ±0,2 % */
export function prepOk([task, solute, water]: Prep) {
  const target = TASKS[task];
  return Math.abs(solute + water - target.mass) <= 0.5 && Math.abs(fraction(solute, water) - target.w) <= 0.2;
}

/** Әр тапсырманың соңғы сәтті ерітіндісі */
export const lastGood = (preps: readonly Prep[]) => TASKS.map((_, i) => [...preps].reverse().find((p) => p[0] === i && prepOk(p)) ?? null);

export const massFractionDone = (preps: readonly Prep[]) => lastGood(preps).every(Boolean);
