import { absorbCO2, entries } from "@/features/chem-engine";
import type { Game } from "../core/context";

/**
 * Бөлінген газ: түтік жалғанса — B ыдысына өтеді (CO₂ әк суына сіңеді), әйтпесе ыдыстың аузында жиналады.
 * Аузындағы газ біртіндеп тарайды: пробиркада τ = 30 с, стаканда τ = 8 с; тығынмен жабылған A-да тарамайды.
 */
export function gasStep(G: Game, gdt: number): void {
  for (const o of G.vessels) {
    const out = o.s.gasOut;
    if (out) {
      const B = o.link && o.link.B ? o.link.B.v : null;
      for (const [type, n] of entries(out)) {
        if (n <= 0) continue;
        if (B) {
          let rest = n;
          if (type === "CO2") rest = absorbCO2(B.s, n);
          B.s.fizz += n * 900;
          B.head[type] = (B.head[type] || 0) + rest * 0.8;
        } else o.head[type] = (o.head[type] || 0) + n;
      }
      o.s.gasOut = {};
    }
    const tau = o.link && o.link.A === o.it ? 1e9 : o.kind === "tube" ? 30 : 8;
    for (const k of Object.keys(o.head) as (keyof typeof o.head)[]) o.head[k] *= Math.exp(-gdt / tau);
  }
}
