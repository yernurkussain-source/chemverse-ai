/**
 * «Ерігіштік» (9-сынып): 100 г суға тұзды біртіндеп қосып, қаныққан ерітіндінің шегін (ерігіштікті) табу.
 * Ерігіштік (г / 100 г су) — мектептегі ерігіштік кестесі. Модель санды көрсетпейді: тек «толық еріді» не «кристалдар қалды».
 */
export const SALTS = ["KNO3", "NaCl"] as const;
export type Salt = (typeof SALTS)[number];
export const TEMPS = [0, 10, 20, 30, 40, 50, 60] as const;

export const SOLUBILITY: Record<Salt, readonly number[]> = {
  KNO3: [13.3, 20.9, 31.6, 45.8, 63.9, 85.5, 110],
  NaCl: [35.7, 35.8, 36.0, 36.3, 36.6, 37.0, 37.3],
};

export const solubility = (salt: Salt, t: number) => SOLUBILITY[salt][TEMPS.indexOf(t as (typeof TEMPS)[number])];

/** Бақылау кестесінде өлшенетін нүктелер */
export const REQUIRED: readonly [Salt, number][] = [
  ["KNO3", 20],
  ["KNO3", 40],
  ["KNO3", 60],
  ["NaCl", 20],
  ["NaCl", 40],
  ["NaCl", 60],
];

/** Оқушының әр сынамасы: [тұз, t °C, қосылған тұз, г] */
export type Sample = [Salt, number, number];

export const isSample = (e: unknown): e is Sample =>
  Array.isArray(e) &&
  e.length === 3 &&
  (SALTS as readonly unknown[]).includes(e[0]) &&
  (TEMPS as readonly unknown[]).includes(e[1]) &&
  typeof e[2] === "number" &&
  e[2] >= 0 &&
  e[2] <= 200;

export const saturated = ([salt, t, added]: Sample) => added > solubility(salt, t);

/** Әр (тұз, t) үшін шекара: low — толық ерігендердің ең үлкені, high — кристалдар қалғандардың ең кішісі */
export function brackets(samples: readonly Sample[]) {
  const map = new Map<string, { salt: Salt; t: number; low: number; high: number | null }>();
  for (const s of samples) {
    const key = `${s[0]}:${s[1]}`;
    const b = map.get(key) ?? { salt: s[0], t: s[1], low: 0, high: null };
    if (saturated(s)) b.high = b.high === null ? s[2] : Math.min(b.high, s[2]);
    else b.low = Math.max(b.low, s[2]);
    map.set(key, b);
  }
  return map;
}

/** Тәжірибе аяқталды: әр қажетті нүктеде қаныққан ерітінді алынды */
export const solubilityDone = (samples: readonly Sample[]) => REQUIRED.every(([salt, t]) => samples.some((s) => s[0] === salt && s[1] === t && saturated(s)));
