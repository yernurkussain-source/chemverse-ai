import { emit, engineStats } from "./events";
import type { IonId, Ions, PptId } from "./ions";
import { addIon, addPpt, entries, g, gas, heat, pp, remPpt, take, type Vessel } from "./vessel";

/**
 * Лездік реакция: n(v) — қанша моль жүре алады, apply(v, n) — жүргізу, dH — жылу эффектісі (кДж/моль).
 */
export type InstantReaction = {
  key: string;
  eq: string;
  dH?: number;
  n: (v: Vessel) => number;
  apply: (v: Vessel, n: number) => void;
};

/** Тұнба түзілуі: re — әрекеттесетін иондар (стехиометриясы), extra.k — тұнба коэффициенті, extra.co2 — бөлінетін CO₂ */
function precip(key: string, ppt: PptId, re: Ions, eq: string, extra?: { k?: number; co2?: number }): InstantReaction {
  return {
    key,
    eq,
    n: (v) => Math.min(...entries(re).map(([i, c]) => g(v, i) / c)),
    apply: (v, n) => {
      for (const [i, c] of entries(re)) take(v, i, c * n);
      addPpt(v, ppt, ((extra && extra.k) || 1) * n);
      if (extra && extra.co2) gas(v, "CO2", extra.co2 * n);
    },
  };
}

/** Тұнбаның қышқылда еруі: h — бір моль тұнбаға жұмсалатын H⁺, ionK — түзілетін ион мөлшері */
function dissolve(key: string, ppt: PptId, h: number, ion: IonId, ionK: number, eq: string, co2?: boolean): InstantReaction {
  return {
    key,
    eq,
    n: (v) => Math.min(g(v, "H") / h, pp(v, ppt)),
    apply: (v, n) => {
      take(v, "H", h * n);
      remPpt(v, ppt, n);
      addIon(v, ion, ionK * n);
      if (co2) gas(v, "CO2", n);
    },
  };
}

/** Реті маңызды: equilibrate() оларды осы ретпен қайталап жүргізеді */
export const INSTANT: InstantReaction[] = [
  {
    key: "neut",
    eq: "H⁺ + OH⁻ → H₂O",
    dH: -57.1,
    n: (v) => Math.min(g(v, "H"), g(v, "OH")),
    apply: (v, n) => {
      take(v, "H", n);
      take(v, "OH", n);
      engineStats.neut += n;
    },
  },
  {
    key: "hco3",
    eq: "H⁺ + CO₃²⁻ → HCO₃⁻",
    n: (v) => Math.min(g(v, "H"), g(v, "CO3")),
    apply: (v, n) => {
      take(v, "H", n);
      take(v, "CO3", n);
      addIon(v, "HCO3", n);
    },
  },
  {
    key: "acidCO3",
    eq: "H⁺ + HCO₃⁻ → CO₂↑ + H₂O",
    n: (v) => Math.min(g(v, "H"), g(v, "HCO3")),
    apply: (v, n) => {
      take(v, "H", n);
      take(v, "HCO3", n);
      gas(v, "CO2", n);
    },
  },
  {
    key: "ohHCO3",
    eq: "HCO₃⁻ + OH⁻ → CO₃²⁻ + H₂O",
    n: (v) => Math.min(g(v, "OH"), g(v, "HCO3")),
    apply: (v, n) => {
      take(v, "OH", n);
      take(v, "HCO3", n);
      addIon(v, "CO3", n);
    },
  },
  dissolve("dCuOH2", "CuOH2", 2, "Cu", 1, "Cu(OH)₂ + 2H⁺ → Cu²⁺ + 2H₂O"),
  dissolve("dFeOH3", "FeOH3", 3, "Fe3", 1, "Fe(OH)₃ + 3H⁺ → Fe³⁺ + 3H₂O"),
  dissolve("dFeOH2", "FeOH2", 2, "Fe2", 1, "Fe(OH)₂ + 2H⁺ → Fe²⁺ + 2H₂O"),
  dissolve("dMgOH2", "MgOH2", 2, "Mg", 1, "Mg(OH)₂ + 2H⁺ → Mg²⁺ + 2H₂O"),
  dissolve("dZnOH2", "ZnOH2", 2, "Zn", 1, "Zn(OH)₂ + 2H⁺ → Zn²⁺ + 2H₂O"),
  dissolve("dAg2O", "Ag2O", 2, "Ag", 2, "Ag₂O + 2H⁺ → 2Ag⁺ + H₂O"),
  dissolve("dCaCO3", "CaCO3", 2, "Ca", 1, "CaCO₃ + 2H⁺ → Ca²⁺ + CO₂↑ + H₂O", true),
  dissolve("dBaCO3", "BaCO3", 2, "Ba", 1, "BaCO₃ + 2H⁺ → Ba²⁺ + CO₂↑ + H₂O", true),
  dissolve("dCuCarb", "CuCarb", 4, "Cu", 2, "(CuOH)₂CO₃ + 4H⁺ → 2Cu²⁺ + CO₂↑ + 3H₂O", true),
  {
    key: "dZnOH4",
    eq: "[Zn(OH)₄]²⁻ + 4H⁺ → Zn²⁺ + 4H₂O",
    n: (v) => Math.min(g(v, "H") / 4, g(v, "ZnOH4")),
    apply: (v, n) => {
      take(v, "H", 4 * n);
      take(v, "ZnOH4", n);
      addIon(v, "Zn", n);
    },
  },
  precip("pAgCl", "AgCl", { Ag: 1, Cl: 1 }, "Ag⁺ + Cl⁻ → AgCl↓"),
  precip("pAgI", "AgI", { Ag: 1, I: 1 }, "Ag⁺ + I⁻ → AgI↓"),
  precip("pBaSO4", "BaSO4", { Ba: 1, SO4: 1 }, "Ba²⁺ + SO₄²⁻ → BaSO₄↓"),
  precip("pBaCO3", "BaCO3", { Ba: 1, CO3: 1 }, "Ba²⁺ + CO₃²⁻ → BaCO₃↓"),
  precip("pCaCO3", "CaCO3", { Ca: 1, CO3: 1 }, "Ca²⁺ + CO₃²⁻ → CaCO₃↓"),
  precip("pCuCarb", "CuCarb", { Cu: 2, CO3: 2 }, "2Cu²⁺ + 2CO₃²⁻ + H₂O → (CuOH)₂CO₃↓ + CO₂↑", { co2: 1 }),
  precip("pFeCarb", "FeOH3", { Fe3: 2, CO3: 3 }, "2Fe³⁺ + 3CO₃²⁻ + 3H₂O → 2Fe(OH)₃↓ + 3CO₂↑", { k: 2, co2: 3 }),
  precip("pCuOH2", "CuOH2", { Cu: 1, OH: 2 }, "Cu²⁺ + 2OH⁻ → Cu(OH)₂↓"),
  precip("pFeOH3", "FeOH3", { Fe3: 1, OH: 3 }, "Fe³⁺ + 3OH⁻ → Fe(OH)₃↓"),
  precip("pFeOH2", "FeOH2", { Fe2: 1, OH: 2 }, "Fe²⁺ + 2OH⁻ → Fe(OH)₂↓"),
  precip("pMgOH2", "MgOH2", { Mg: 1, OH: 2 }, "Mg²⁺ + 2OH⁻ → Mg(OH)₂↓"),
  precip("pZnOH2", "ZnOH2", { Zn: 1, OH: 2 }, "Zn²⁺ + 2OH⁻ → Zn(OH)₂↓"),
  precip("pAg2O", "Ag2O", { Ag: 2, OH: 2 }, "2Ag⁺ + 2OH⁻ → Ag₂O↓ + H₂O"),
  {
    key: "amph",
    eq: "Zn(OH)₂ + 2OH⁻ → [Zn(OH)₄]²⁻",
    n: (v) => Math.min(pp(v, "ZnOH2"), g(v, "OH") / 2),
    apply: (v, n) => {
      remPpt(v, "ZnOH2", n);
      take(v, "OH", 2 * n);
      addIon(v, "ZnOH4", n);
      engineStats.amph = true;
    },
  },
];

/** Лездік реакцияларды тепе-теңдікке дейін жүргізу (ең көбі 14 айналым) */
export function equilibrate(v: Vessel): void {
  if (v.V <= 0) return;
  for (let it = 0; it < 14; it++) {
    let any = false;
    for (const R of INSTANT) {
      const n = R.n(v);
      if (n > 1e-11) {
        const T0 = v.T;
        R.apply(v, n);
        if (R.dH) heat(v, -R.dH * 1000 * n);
        any = true;
        emit(v, R.key, { eq: R.eq, dT: v.T - T0 });
      }
    }
    if (!any) break;
  }
}
