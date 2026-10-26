import type { MatrixResult, MatrixSpec } from "../../matrix/spec";

/**
 * «Химиялық тепе-теңдік» (10-сынып): Ле Шателье принципі. Екі жүйе:
 *  1) N₂O₄ ⇌ 2NO₂ (ΔH° = +57,2 кДж/моль, ΔS° = +175,8 Дж/(моль·К)) — температура мен қысымның әсері;
 *  2) Fe³⁺ + SCN⁻ ⇌ FeSCN²⁺ (K = 140; мектепте: FeCl₃ + 3KSCN ⇌ Fe(SCN)₃ + 3KCl) — концентрацияның әсері.
 * Әр әрекет бастапқы күйден басталады; ығысу бағытын өнімнің мөлшері қалай өзгергені анықтайды.
 */
const R = 8.314;
const DH = 57200;
const DS = 175.8;

/** Kp(T) = exp(−ΔG° / RT), T — °C */
export const kp = (tC: number) => {
  const T = tC + 273.15;
  return Math.exp(-(DH - T * DS) / (R * T));
};

/** NO₂-нің мольдік үлесі: α = √(Kp / (Kp + 4P)), x = 2α / (1 + α); P — бар */
export function no2Fraction(tC: number, P: number) {
  const K = kp(tC);
  const a = Math.sqrt(K / (K + 4 * P));
  return (2 * a) / (1 + a);
}

/** Қоңыр түстің қанықтығы ∝ c(NO₂) = x · P / (RT) */
const no2Conc = (tC: number, P: number) => (no2Fraction(tC, P) * P) / (0.08314 * (tC + 273.15));

const K_FE = 140;
/** [FeSCN²⁺], М: K·x² − (K(Fe + S) + 1)·x + K·Fe·S = 0 теңдеуінің кіші түбірі */
export function complex(fe: number, scn: number) {
  const b = K_FE * (fe + scn) + 1;
  return (b - Math.sqrt(b * b - 4 * K_FE * K_FE * fe * scn)) / (2 * K_FE);
}

export const ACTIONS = ["heat", "cool", "compress", "addFe", "addSCN", "addAlkali"] as const;
export type EquilibriumAction = (typeof ACTIONS)[number];
export const SHIFTS = ["forward", "reverse", "none"] as const;

const BASE = { t: 25, P: 1, fe: 0.002, scn: 0.002 };
const AFTER: Record<EquilibriumAction, Partial<typeof BASE>> = {
  heat: { t: 80 },
  cool: { t: 0 },
  compress: { P: 2 },
  addFe: { fe: 0.006 },
  addSCN: { scn: 0.006 },
  // NaOH Fe³⁺ иондарын Fe(OH)₃ тұнбасына байлайды: ерітіндіде 30 %-ы қалады
  addAlkali: { fe: 0.0006 },
};

const isGas = (a: EquilibriumAction) => a === "heat" || a === "cool" || a === "compress";

/** Әрекеттің нәтижесі: өнімнің мөлшері (NO₂ үлесі, % не [FeSCN²⁺], ммоль/л) және түстің қанықтығы */
export function applyAction(a: EquilibriumAction) {
  const s = { ...BASE, ...AFTER[a] };
  if (isGas(a)) {
    return {
      before: no2Fraction(BASE.t, BASE.P) * 100,
      after: no2Fraction(s.t, s.P) * 100,
      colorBefore: no2Conc(BASE.t, BASE.P),
      colorAfter: no2Conc(s.t, s.P),
    };
  }
  const before = complex(BASE.fe, BASE.scn) * 1000;
  const after = complex(s.fe, s.scn) * 1000;
  return { before, after, colorBefore: before, colorAfter: after };
}

/** Ығысу бағыты: өнім көбейсе — тура (→), азайса — кері (←) */
export function shiftOf(a: EquilibriumAction): (typeof SHIFTS)[number] {
  const r = applyAction(a);
  return Math.abs(r.after - r.before) < 1e-9 ? "none" : r.after > r.before ? "forward" : "reverse";
}

const round = (n: number) => Math.round(n * 10) / 10;

export const EQUILIBRIUM_SPEC: MatrixSpec = {
  rows: ACTIONS,
  tests: () => ["apply"],
  mode: "explore",
  result: (row): MatrixResult => {
    const a = ACTIONS[row];
    const r = applyAction(a);
    const darker = r.colorAfter > r.colorBefore;
    // Қоңыр (NO₂) не қызыл (FeSCN²⁺) түстің қанықтығы
    const strength = isGas(a) ? Math.min(1, r.colorAfter / 0.03) : Math.min(1, r.colorAfter / 1);
    const color = isGas(a) ? `rgba(150,70,20,${0.15 + 0.8 * strength})` : `rgba(170,20,20,${0.15 + 0.8 * strength})`;
    return {
      seen: `${isGas(a) ? "no2" : "fe"}${darker ? "Darker" : "Lighter"}`,
      values: { before: round(r.before), after: round(r.after) },
      visual: { kind: "swatch", color },
    };
  },
};
