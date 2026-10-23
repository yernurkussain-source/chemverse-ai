import { KW, type IonId } from "./ions";
import { g, type Vessel } from "./vessel";

/**
 * Ерітіндінің pH-ы (ыдыс бос болса — null).
 * Есепке алынады: күшті қышқыл/негіз артығы, әлсіз қышқыл катиондар (Fe³⁺, Cu²⁺, Zn²⁺, Fe²⁺ гидролизі),
 * карбонат гидролизі, карбонат буфері (pKa 10,33) және гидрокарбонат (pH 8,34).
 */
export function pH(v: Vessel): number | null {
  if (v.V <= 0.05) return null;
  const L = v.V / 1000;
  const c = (k: IonId) => g(v, k) / L;
  const d = c("H") - c("OH");
  const A = 6.3e-3 * c("Fe3") + 1e-7 * c("Cu") + 1e-9 * c("Zn") + 3e-10 * c("Fe2");
  const B = 2.1e-4 * c("CO3");
  const hc = c("HCO3");
  const co = c("CO3");
  let h: number;
  if (d > 1e-7) h = d / 2 + Math.sqrt((d * d) / 4 + A + KW);
  else if (d < -1e-7) {
    const o = -d;
    const oh = o / 2 + Math.sqrt((o * o) / 4 + B + KW);
    h = KW / oh;
  } else if (hc > 1e-6 && co > 1e-6) h = Math.pow(10, -(10.33 + Math.log10(co / hc)));
  else if (hc > 1e-6) h = Math.pow(10, -8.34);
  else if (B > A) h = KW / Math.sqrt(B + KW);
  else h = Math.sqrt(A + KW);
  return -Math.log10(h);
}
