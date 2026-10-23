/**
 * Химия қозғалтқышының тұрақтылары, иондары және тұнбалары.
 * Барлық сан docs/game/prototype/engine.js-тен өзгертілмей көшірілген (оларға тесттер тәуелді).
 */

/** Судың иондық көбейтіндісі (25 °C) */
export const KW = 1e-14;
/** Бөлме температурасы, °C */
export const AMB = 22;
/** Шыны ыдыстың жылу сыйымдылығы, Дж/К (судікі: 4,18 Дж/(г·К)) */
export const C_GLASS = 40;

export type IonId =
  | "H"
  | "OH"
  | "Na"
  | "K"
  | "Ag"
  | "Cu"
  | "Fe2"
  | "Fe3"
  | "Zn"
  | "Mg"
  | "Ca"
  | "Ba"
  | "Cl"
  | "NO3"
  | "I"
  | "SO4"
  | "CO3"
  | "HCO3"
  | "ZnOH4"
  | "H2O2";

/** z — заряд, M — молярлық масса (г/моль), f — формуласы */
export type IonInfo = { z: number; M: number; f: string };

export const ION: Record<IonId, IonInfo> = {
  H: { z: 1, M: 1.008, f: "H⁺" },
  OH: { z: -1, M: 17.01, f: "OH⁻" },
  Na: { z: 1, M: 22.99, f: "Na⁺" },
  K: { z: 1, M: 39.1, f: "K⁺" },
  Ag: { z: 1, M: 107.87, f: "Ag⁺" },
  Cu: { z: 2, M: 63.55, f: "Cu²⁺" },
  Fe2: { z: 2, M: 55.85, f: "Fe²⁺" },
  Fe3: { z: 3, M: 55.85, f: "Fe³⁺" },
  Zn: { z: 2, M: 65.38, f: "Zn²⁺" },
  Mg: { z: 2, M: 24.31, f: "Mg²⁺" },
  Ca: { z: 2, M: 40.08, f: "Ca²⁺" },
  Ba: { z: 2, M: 137.33, f: "Ba²⁺" },
  Cl: { z: -1, M: 35.45, f: "Cl⁻" },
  NO3: { z: -1, M: 62.0, f: "NO₃⁻" },
  I: { z: -1, M: 126.9, f: "I⁻" },
  SO4: { z: -2, M: 96.06, f: "SO₄²⁻" },
  CO3: { z: -2, M: 60.01, f: "CO₃²⁻" },
  HCO3: { z: -1, M: 61.02, f: "HCO₃⁻" },
  ZnOH4: { z: -2, M: 133.41, f: "[Zn(OH)₄]²⁻" },
  H2O2: { z: 0, M: 34.01, f: "H₂O₂" },
};

/** Ыдыстағы иондар: моль */
export type Ions = Partial<Record<IonId, number>>;

export type PptId =
  | "AgCl"
  | "AgI"
  | "BaSO4"
  | "BaCO3"
  | "CaCO3"
  | "CuOH2"
  | "FeOH3"
  | "FeOH2"
  | "MgOH2"
  | "ZnOH2"
  | "Ag2O"
  | "CuCarb";

/** Түс: [R, G, B], 0–255 */
export type RGB = [number, number, number];

/** f — формуласы, M — молярлық масса (г/моль), col — тұнбаның түсі */
export type PptInfo = { f: string; M: number; col: RGB };

export const PPT: Record<PptId, PptInfo> = {
  AgCl: { f: "AgCl", M: 143.32, col: [244, 244, 238] },
  AgI: { f: "AgI", M: 234.77, col: [238, 222, 130] },
  BaSO4: { f: "BaSO₄", M: 233.39, col: [250, 250, 250] },
  BaCO3: { f: "BaCO₃", M: 197.34, col: [246, 246, 246] },
  CaCO3: { f: "CaCO₃", M: 100.09, col: [246, 246, 246] },
  CuOH2: { f: "Cu(OH)₂", M: 97.56, col: [70, 140, 232] },
  FeOH3: { f: "Fe(OH)₃", M: 106.87, col: [158, 72, 30] },
  FeOH2: { f: "Fe(OH)₂", M: 89.86, col: [118, 140, 108] },
  MgOH2: { f: "Mg(OH)₂", M: 58.32, col: [246, 246, 246] },
  ZnOH2: { f: "Zn(OH)₂", M: 99.42, col: [246, 246, 246] },
  Ag2O: { f: "Ag₂O", M: 231.74, col: [92, 62, 42] },
  CuCarb: { f: "(CuOH)₂CO₃", M: 221.12, col: [62, 168, 150] },
};

/** Тұнбалар: моль */
export type PptMap = Partial<Record<PptId, number>>;
