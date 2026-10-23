import type { IonId, Ions } from "./ions";

/**
 * Реактивтер мен металдар (docs/game/prototype/engine.js, сандар өзгертілмеген).
 * Атаулары мен ескертулері мұнда жоқ — олар messages/*.json ішінде аударылады.
 */

export type LiquidId =
  | "HCl"
  | "H2SO4"
  | "NaOH"
  | "CaOH2"
  | "Na2CO3"
  | "NaCl"
  | "KI"
  | "AgNO3"
  | "BaCl2"
  | "CuSO4"
  | "FeCl3"
  | "H2O"
  | "H2O2";
export type IndicatorId = "php" | "mo" | "lit" | "uni";
export type SolidId = "Mg" | "Zn" | "Fe" | "Cu" | "CaCO3" | "MnO2";
export type ReagentId = LiquidId | IndicatorId | SolidId;

/** g — көзілдірік керек, gl — көзілдірік пен қолғап керек */
export type Hazard = "g" | "gl";

/** Ерітінді: ions — 1 литрдегі иондар (моль/л); molar — концентрациясы (М) не percent — массалық үлесі (%) */
export type LiquidReagent = { id: LiquidId; kind: "liq"; f: string; ions: Ions; haz?: Hazard; molar?: number; percent?: number };
/** Индикатор: тамшылап қосылады (ыдыстағы тамшы саны ғана есептеледі) */
export type IndicatorReagent = { id: IndicatorId; kind: "ind" };
/** Қатты зат: n — бір кесектің моль саны, grams — массасы */
export type SolidReagent = { id: SolidId; kind: "sol"; f: string; n: number; grams: number };
export type Reagent = LiquidReagent | IndicatorReagent | SolidReagent;

export const LIQUIDS: Record<LiquidId, LiquidReagent> = {
  HCl: { id: "HCl", kind: "liq", f: "HCl", molar: 1, ions: { H: 1, Cl: 1 }, haz: "g" },
  H2SO4: { id: "H2SO4", kind: "liq", f: "H₂SO₄", molar: 0.5, ions: { H: 1, SO4: 0.5 }, haz: "g" },
  NaOH: { id: "NaOH", kind: "liq", f: "NaOH", molar: 1, ions: { Na: 1, OH: 1 }, haz: "g" },
  CaOH2: { id: "CaOH2", kind: "liq", f: "Ca(OH)₂", molar: 0.02, ions: { Ca: 0.02, OH: 0.04 }, haz: "g" },
  Na2CO3: { id: "Na2CO3", kind: "liq", f: "Na₂CO₃", molar: 0.5, ions: { Na: 1, CO3: 0.5 } },
  NaCl: { id: "NaCl", kind: "liq", f: "NaCl", molar: 1, ions: { Na: 1, Cl: 1 } },
  KI: { id: "KI", kind: "liq", f: "KI", molar: 0.5, ions: { K: 0.5, I: 0.5 } },
  AgNO3: { id: "AgNO3", kind: "liq", f: "AgNO₃", molar: 0.1, ions: { Ag: 0.1, NO3: 0.1 }, haz: "gl" },
  BaCl2: { id: "BaCl2", kind: "liq", f: "BaCl₂", molar: 0.5, ions: { Ba: 0.5, Cl: 1 }, haz: "gl" },
  CuSO4: { id: "CuSO4", kind: "liq", f: "CuSO₄", molar: 0.5, ions: { Cu: 0.5, SO4: 0.5 }, haz: "gl" },
  FeCl3: { id: "FeCl3", kind: "liq", f: "FeCl₃", molar: 0.5, ions: { Fe3: 0.5, Cl: 1.5 }, haz: "gl" },
  H2O: { id: "H2O", kind: "liq", f: "H₂O", ions: {} },
  H2O2: { id: "H2O2", kind: "liq", f: "H₂O₂", percent: 3, ions: { H2O2: 0.88 }, haz: "g" },
};

export const INDICATORS: Record<IndicatorId, IndicatorReagent> = {
  php: { id: "php", kind: "ind" },
  mo: { id: "mo", kind: "ind" },
  lit: { id: "lit", kind: "ind" },
  uni: { id: "uni", kind: "ind" },
};

export const SOLIDS: Record<SolidId, SolidReagent> = {
  Mg: { id: "Mg", kind: "sol", f: "Mg", n: 0.05 / 24.31, grams: 0.05 },
  Zn: { id: "Zn", kind: "sol", f: "Zn", n: 0.3 / 65.38, grams: 0.3 },
  Fe: { id: "Fe", kind: "sol", f: "Fe", n: 0.5 / 55.85, grams: 0.5 },
  Cu: { id: "Cu", kind: "sol", f: "Cu", n: 0.5 / 63.55, grams: 0.5 },
  CaCO3: { id: "CaCO3", kind: "sol", f: "CaCO₃", n: 0.5 / 100.09, grams: 0.5 },
  MnO2: { id: "MnO2", kind: "sol", f: "MnO₂", n: 0.1 / 86.94, grams: 0.1 },
};

/** Барлық реактив (прототиптегі REAG тізімінің реті) */
export const REAG: Reagent[] = [...Object.values(LIQUIDS), ...Object.values(INDICATORS), ...Object.values(SOLIDS)];
export const REAG_BY = Object.fromEntries(REAG.map((r) => [r.id, r])) as Record<ReagentId, Reagent>;

/**
 * Металдар мен қатты заттардың реакциялары:
 * k — қышқылмен жылдамдық тұрақтысы, ion — түзілетін ион, dH — жылу эффектісі (кДж/моль),
 * kCu / kAg — Cu²⁺ / Ag⁺ ығыстыру жылдамдығы, carb — карбонат (CO₂ бөледі), cat — катализатор (жұмсалмайды)
 */
export type Metal = {
  M: number;
  k: number;
  ion?: IonId;
  dH?: number;
  kCu?: number;
  kAg?: number;
  eq?: string;
  carb?: boolean;
  cat?: boolean;
};

export const METAL: Record<SolidId, Metal> = {
  Mg: { k: 0.03, ion: "Mg", dH: -466.9, M: 24.31, kCu: 0.02, kAg: 0.05, eq: "Mg + 2H⁺ → Mg²⁺ + H₂↑" },
  Zn: { k: 0.002, ion: "Zn", dH: -153.9, M: 65.38, kCu: 0.008, kAg: 0.03, eq: "Zn + 2H⁺ → Zn²⁺ + H₂↑" },
  Fe: { k: 0.0007, ion: "Fe2", dH: -89.1, M: 55.85, kCu: 0.004, kAg: 0.02, eq: "Fe + 2H⁺ → Fe²⁺ + H₂↑" },
  Cu: { k: 0, ion: "Cu", M: 63.55, kCu: 0, kAg: 0.02 },
  CaCO3: { k: 0.004, ion: "Ca", M: 100.09, carb: true, eq: "CaCO₃ + 2H⁺ → Ca²⁺ + CO₂↑ + H₂O" },
  MnO2: { k: 0, M: 86.94, kCu: 0, kAg: 0, cat: true },
};
