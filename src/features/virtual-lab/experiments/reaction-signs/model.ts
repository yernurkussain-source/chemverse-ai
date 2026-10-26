import { addLiquid, addPiece, AMB, liquidColor, newVessel, PPT, step, type Ions, type PptId, type Vessel } from "@/features/chem-engine";
import type { MatrixResult, MatrixSpec } from "../../matrix/spec";

/**
 * «Химиялық реакция белгілері» (8-сынып): 6 реакция × 2 сынақ (араластыру, термометр).
 * Барлығын ортақ химия қозғалтқышы есептейді (3D зертханамен бірдей): газ, тұнба, индикатор түсі, жылу эффектісі.
 */
export const REACTIONS = ["sodaAcid", "copperAlkali", "magnesiumAcid", "neutralization", "silverChloride", "ironAlkali"] as const;
export type ReactionId = (typeof REACTIONS)[number];
export const TESTS = ["mix", "thermometer"] as const;
export const SIGNS = ["gas", "precipitate", "color", "heat"] as const;

const HCL: Ions = { H: 1, Cl: 1 };
const NAOH: Ions = { Na: 1, OH: 1 };

/** Реакцияны жүргізу: 10 мл + 10 мл (магний — 0,05 г кесек 10 мл HCl-ға, 60 с) */
function run(id: ReactionId): Vessel {
  const v = newVessel("tube", 30, "tube");
  switch (id) {
    case "sodaAcid":
      addLiquid(v, { Na: 1, CO3: 0.5 }, 10);
      addLiquid(v, HCL, 10);
      break;
    case "copperAlkali":
      addLiquid(v, { Cu: 0.5, SO4: 0.5 }, 10);
      addLiquid(v, NAOH, 10);
      break;
    case "magnesiumAcid":
      addLiquid(v, HCL, 10);
      addPiece(v, "Mg");
      for (let t = 0; t < 60; t += 0.5) step(v, 0.5, false);
      break;
    case "neutralization":
      addLiquid(v, NAOH, 10);
      v.ind.php = 2;
      addLiquid(v, HCL, 10);
      break;
    case "silverChloride":
      addLiquid(v, { Ag: 0.1, NO3: 0.1 }, 10);
      addLiquid(v, { Na: 1, Cl: 1 }, 10);
      break;
    case "ironAlkali":
      addLiquid(v, { Fe3: 0.5, Cl: 1.5 }, 10);
      addLiquid(v, NAOH, 10);
      break;
  }
  return v;
}

export type ReactionOutcome = { sign: (typeof SIGNS)[number]; dT: number; ppt: PptId | null; gas: boolean; liquid: string };

const cache = new Map<ReactionId, ReactionOutcome>();
export function outcome(id: ReactionId): ReactionOutcome {
  const hit = cache.get(id);
  if (hit) return hit;
  const v = run(id);
  const ppt = (Object.keys(v.ppt) as PptId[]).find((p) => (v.ppt[p] ?? 0) > 1e-9) ?? null;
  const gas = Object.values(v.gasOut ?? {}).some((n) => (n ?? 0) > 1e-6);
  // Көзбен көрінетін басты белгі: тұнба → газ → индикатордың түсі (жылуды термометр көрсетеді)
  const sign = ppt ? "precipitate" : gas ? "gas" : id === "neutralization" ? "color" : "heat";
  const c = liquidColor(v);
  const result = { sign, dT: Math.round((v.T - AMB) * 10) / 10, ppt, gas, liquid: `rgba(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)},${Math.max(c.a, 0.3)})` } as const;
  cache.set(id, result);
  return result;
}

const SEEN: Record<ReactionId, string> = {
  sodaAcid: "fizz",
  copperAlkali: "bluePpt",
  magnesiumAcid: "metalFizz",
  neutralization: "pinkGone",
  silverChloride: "whitePpt",
  ironAlkali: "brownPpt",
};

export const SIGNS_SPEC: MatrixSpec = {
  rows: REACTIONS,
  tests: () => TESTS,
  mode: "explore",
  result: (row, test): MatrixResult => {
    const id = REACTIONS[row];
    const o = outcome(id);
    if (test === "thermometer") return { seen: "temperature", values: { t0: AMB, t1: Math.round((AMB + o.dT) * 10) / 10 }, visual: { kind: "icon", icon: "🌡️" } };
    const ppt = o.ppt ? `rgb(${PPT[o.ppt].col.join(",")})` : undefined;
    return { seen: SEEN[id], visual: { kind: "tube", liquid: o.liquid, ppt, gas: o.gas } };
  },
};
