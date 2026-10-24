import { emit, engineStats } from "./events";
import { AMB, C_GLASS, ION } from "./ions";
import { equilibrate } from "./reactions";
import { METAL } from "./reagents";
import { dryOut } from "./residue";
import { addIon, g, gas, heat, take, type Vessel } from "./vessel";

/** Вант-Гофф ережесінің әдепкі коэффициенті: температура 10 °C көтерілсе, жылдамдық 2 есе өседі */
export const VANT_HOFF_GAMMA = 2;

/** Вант-Гофф ережесі: 20 °C-пен салыстырғанда жылдамдық неше есе өзгереді — γ^((T − 20)/10) */
export const vantHoff = (T: number, gamma: number = VANT_HOFF_GAMMA) => Math.pow(gamma, (T - 20) / 10);

/**
 * Уақыт бойынша өзгерістер (dt секунд): металдардың қышқылмен және тұз ерітінділерімен реакциясы,
 * MnO₂ катализі, плиткада қыздыру, қайнау, буландыру, суу, тұнбаның шөгуі.
 * Металл + H⁺: бірінші ретті, dn/dt = −k · [H⁺] · n · γ^((T − 20)/10), γ = 2.
 */
export function step(v: Vessel, dt: number, heaterOn: boolean): void {
  const tf = vantHoff(v.T);
  if (v.V > 0.05) {
    const L = v.V / 1000;
    for (const p of v.pieces) {
      if (p.n <= 1e-9) continue;
      const m = METAL[p.metal];
      if (m.cat) {
        const h2o2 = g(v, "H2O2");
        if (h2o2 > 1e-9) {
          const dn = h2o2 * (1 - Math.exp(-0.035 * tf * dt));
          const T0 = v.T;
          take(v, "H2O2", dn);
          gas(v, "O2", dn / 2);
          heat(v, 98000 * dn);
          emit(v, "cat", { eq: "2H₂O₂ → 2H₂O + O₂↑ (MnO₂ — катализатор)", dT: v.T - T0 });
        }
        continue;
      }
      // Катализатордан басқа заттардың бәрінде ion бар; eq — қышқылмен әрекеттесетіндерде (k > 0)
      const ion = m.ion!;
      const cH = g(v, "H") / L;
      if (m.k > 0 && cH > 1e-5) {
        const dn = Math.min(m.k * cH * p.n * tf * dt, p.n, g(v, "H") / 2);
        if (dn > 0) {
          const T0 = v.T;
          p.n -= dn;
          take(v, "H", 2 * dn);
          addIon(v, ion, dn);
          gas(v, m.carb ? "CO2" : "H2", dn);
          if (m.dH) heat(v, -m.dH * 1000 * dn);
          emit(v, "acid_" + p.metal, { eq: m.eq!, dT: v.T - T0 });
        }
      } else if (p.metal === "Cu" && cH > 1e-3 && !g(v, "Ag")) {
        engineStats.noCu = true;
        emit(v, "noCu", { eq: "Cu + H⁺ → реакция жүрмейді" });
      }
      if (p.metal !== "CaCO3") {
        const kCu = m.kCu ?? 0;
        const cCu = g(v, "Cu") / L;
        if (kCu > 0 && cCu > 1e-5 && p.n > 1e-9) {
          const dn = Math.min(kCu * cCu * p.n * tf * dt, p.n, g(v, "Cu"));
          if (dn > 0) {
            p.n -= dn;
            take(v, "Cu", dn);
            addIon(v, ion, dn);
            p.coatCu += dn;
            engineStats.cuDep += dn;
            emit(v, "cu_" + p.metal, { eq: p.metal + " + Cu²⁺ → " + ION[ion].f + " + Cu" });
          }
        }
        const kAg = m.kAg ?? 0;
        const cAg = g(v, "Ag") / L;
        if (kAg > 0 && cAg > 1e-5 && p.n > 1e-9) {
          const dn = Math.min(kAg * cAg * p.n * tf * dt, p.n, g(v, "Ag") / 2);
          if (dn > 0) {
            p.n -= dn;
            take(v, "Ag", 2 * dn);
            addIon(v, ion, dn);
            p.coatAg += 2 * dn;
            engineStats.agDep += 2 * dn;
            emit(v, "ag_" + p.metal, { eq: p.metal + " + 2Ag⁺ → " + ION[ion].f + " + 2Ag" });
          }
        }
      }
    }
    equilibrate(v);
  }
  // Қыздыру (плитка 350 Вт), қайнау, буландыру
  if (v.onHeater && heaterOn) {
    const P = 350 * dt;
    if (v.V > 0.05) {
      if (v.T < 100) {
        heat(v, P);
        if (v.T >= 100) {
          const extra = (v.T - 100) * (v.V * 4.18 + C_GLASS);
          v.T = 100;
          evap(v, extra / 2260);
        }
      } else {
        v.T = 100;
        evap(v, P / 2260);
      }
    } else v.T = Math.min(v.T + (P / C_GLASS) * 0.25, 180);
  } else {
    if (v.T > AMB + 0.01 || v.T < AMB - 0.01) {
      const k = v.V > 0.05 ? 0.0035 : 0.02;
      v.T = AMB + (v.T - AMB) * Math.exp(-k * dt);
    }
    if (v.T < 99.5) v.boil = false;
  }
  for (const k in v.susp) {
    const p = k as keyof typeof v.susp;
    v.susp[p] = (v.susp[p] || 0) * Math.exp(-dt / 6);
  }
  v.fizz *= Math.exp(-dt / 1.4);
}

/** Қайнап жатқан ерітіндіден grams грамм су буланады (2260 Дж/г) */
function evap(v: Vessel, grams: number): void {
  const hc = g(v, "HCO3");
  if (hc > 1e-9) {
    take(v, "HCO3", hc);
    addIon(v, "CO3", hc / 2);
    gas(v, "CO2", hc / 2);
    emit(v, "hco3boil", { eq: "2HCO₃⁻ → CO₃²⁻ + CO₂↑ + H₂O" });
  }
  if (!v.boil) {
    v.boil = true;
    emit(v, "boil", { eq: "t = 100 °C" });
  }
  v.V -= grams;
  if (v.V <= 0.25) dryOut(v);
}
