import type { MatrixResult, MatrixSpec } from "../../matrix/spec";

/**
 * «Заттардың қасиеттері» (7-сынып): 6 зат × 4 сынақ (суда еруі, магнит, электр тогы, масса мен көлем).
 * Тығыздықты оқушы бақылау кестесінде өзі есептейді: ρ = m / V (анықтамалық тығыздықтармен сәйкес).
 */
export const SUBSTANCES = ["salt", "sugar", "sulfur", "iron", "copper", "paraffin"] as const;
export const TESTS = ["water", "magnet", "current", "massVolume"] as const;

/** m (г) және V (см³): ρ — 2,16; 1,59; 2,07; 7,87; 8,96; 0,9 г/см³ */
export const MASS_VOLUME: Record<(typeof SUBSTANCES)[number], { m: number; v: number }> = {
  salt: { m: 21.6, v: 10 },
  sugar: { m: 15.9, v: 10 },
  sulfur: { m: 10.35, v: 5 },
  iron: { m: 39.35, v: 5 },
  copper: { m: 35.84, v: 4 },
  paraffin: { m: 10.8, v: 12 },
};

const P: Record<(typeof SUBSTANCES)[number], [string, string, string]> = {
  salt: ["dissolves", "noAttract", "noCurrent"],
  sugar: ["dissolves", "noAttract", "noCurrent"],
  sulfur: ["floatsPowder", "noAttract", "noCurrent"],
  iron: ["sinks", "attract", "current"],
  copper: ["sinks", "noAttract", "current"],
  paraffin: ["floats", "noAttract", "noCurrent"],
};

export const density = (row: number) => {
  const { m, v } = MASS_VOLUME[SUBSTANCES[row]];
  return Math.round((m / v) * 1000) / 1000;
};

export const PROPERTIES_SPEC: MatrixSpec = {
  rows: SUBSTANCES,
  tests: () => TESTS,
  mode: "explore",
  result: (row, test): MatrixResult => {
    const id = SUBSTANCES[row];
    if (test === "massVolume") return { seen: "massVolume", values: { m: MASS_VOLUME[id].m, v: MASS_VOLUME[id].v } };
    const seen = P[id][TESTS.indexOf(test as (typeof TESTS)[number])];
    return { seen, visual: test === "current" ? { kind: "lamp", level: seen === "current" ? 1 : 0 } : undefined };
  },
};
