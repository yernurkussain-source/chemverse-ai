import type { MatrixResult, MatrixSpec } from "../../matrix/spec";

/**
 * «Электролиттік диссоциация» (10-сынып): 8 ерітінді (0,1 М) × 2 сынақ (тоқ өткізгіштік, иондар моделі).
 * Күшті электролит α ≈ 1, әлсіз — Оствальд заңы: α = √(K / c) (CH₃COOH, NH₃·H₂O: K = 1,8·10⁻⁵).
 * Шамның жарығы иондардың концентрациясына логарифмдік тәуелді (оқу моделі).
 */
export const SOLUTIONS = ["water", "sugar", "ethanol", "NaCl", "HCl", "NaOH", "aceticAcid", "ammonia"] as const;
export const TESTS = ["conduct", "model"] as const;
export const TYPES = ["strong", "weak", "non"] as const;

const C = 0.1;
const K_WEAK = 1.8e-5;
export const TYPE_OF: Record<(typeof SOLUTIONS)[number], (typeof TYPES)[number]> = {
  water: "non",
  sugar: "non",
  ethanol: "non",
  NaCl: "strong",
  HCl: "strong",
  NaOH: "strong",
  aceticAcid: "weak",
  ammonia: "weak",
};

/** Диссоциация дәрежесі (0…1) */
export function alpha(row: number) {
  const type = TYPE_OF[SOLUTIONS[row]];
  return type === "strong" ? 1 : type === "weak" ? Math.sqrt(K_WEAK / C) : 0;
}

/** Шамның жарығы: иондардың концентрациясы 10⁻⁴…10⁻¹ М → 0…1 */
const lamp = (a: number) => (a <= 0 ? 0 : Math.max(0, Math.min(1, Math.log10((a * C) / 1e-4) / 3)));

export const DISSOCIATION_SPEC: MatrixSpec = {
  rows: SOLUTIONS,
  tests: () => TESTS,
  mode: "explore",
  result: (row, test): MatrixResult => {
    const a = alpha(row);
    const type = TYPE_OF[SOLUTIONS[row]];
    if (test === "conduct") return { seen: type === "strong" ? "bright" : type === "weak" ? "dim" : "off", visual: { kind: "lamp", level: lamp(a) } };
    return { seen: type === "strong" ? "ionsAll" : type === "weak" ? "ionsFew" : "ionsNone", values: { alpha: Math.round(a * 1000) / 10 } };
  },
};
