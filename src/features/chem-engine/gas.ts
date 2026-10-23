import { emit, engineStats } from "./events";
import { equilibrate } from "./reactions";
import { addIon, g, pp, remPpt, take, type Vessel } from "./vessel";

/**
 * n моль CO₂ ерітінді арқылы өтеді (газ өткізгіш түтік). Қайтарады: сіңбей шыққан CO₂.
 * Бос OH⁻ болса CO₂ тез сіңеді (әк суы лайланады: CaCO₃). OH⁻ біткенде CO₂ баяу сіңеді (12 %)
 * және артық CO₂ тұнбаны еритін Ca(HCO₃)₂-ге айналдырады (лайлану жоғалады).
 */
export function absorbCO2(v: Vessel, n: number): number {
  if (v.V <= 0.05 || n <= 0) return n;
  let r = n;
  const c0 = pp(v, "CaCO3");
  const a = Math.min(r * 0.9, g(v, "OH") / 2);
  if (a > 0) {
    take(v, "OH", 2 * a);
    addIon(v, "CO3", a);
    r -= a;
    equilibrate(v);
  }
  // Бос OH⁻ жоқ кезде CO₂ баяу сіңеді (әлсіз қышқыл, көпіршіктердің көбі ұшып кетеді)
  let slow = g(v, "OH") > 1e-9 ? 0 : r * 0.12;
  const b = Math.min(slow, g(v, "CO3"));
  if (b > 0) {
    take(v, "CO3", b);
    addIon(v, "HCO3", 2 * b);
    r -= b;
    slow -= b;
  }
  const c = Math.min(slow, pp(v, "CaCO3"));
  if (c > 0) {
    remPpt(v, "CaCO3", c);
    addIon(v, "Ca", c);
    addIon(v, "HCO3", 2 * c);
    r -= c;
    emit(v, "clear", { eq: "CaCO₃ + CO₂ + H₂O → Ca(HCO₃)₂" });
  }
  equilibrate(v);
  if (pp(v, "CaCO3") > c0 + 1e-9) {
    engineStats.lime = true;
    emit(v, "lime", { eq: "CO₂ + Ca(OH)₂ → CaCO₃↓ + H₂O" });
  }
  return r;
}
