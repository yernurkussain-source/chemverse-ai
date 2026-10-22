/**
 * «Реакция жылдамдығы» моделі (docs/chemlab/CHEMLAB_SPEC.md 5.4) — таза функциялар.
 * Mg + 2HCl → MgCl₂ + H₂↑. Магний 0,05 г (шектеуші), қышқыл артық. Модельде γ = 2.
 */
export const RATE = {
  massMg: 0.05,
  molarMg: 24.31,
  /** Газдың молярлық көлемі, л/моль (20 °C, 1 атм — модель) */
  molarVolume: 24.0,
  k0: 0.02,
  gamma: 2,
  /** Тәжірибенің ұзақтығы, с */
  durationSec: 300,
  /** Оқушы графиктен оқитын уақыт, с */
  readAtSec: 30,
} as const;

export const TEMPERATURES = [10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
export const CONCENTRATIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
export const MAX_RUNS = 4;

export type Run = { T: number; c: number };

/** Соңғы көлем: V_max = m / M(Mg) · V_m, мл */
export const vMaxMl = () => (RATE.massMg / RATE.molarMg) * RATE.molarVolume * 1000;

/** Жылдамдық константасы: k = k₀ · c · γ^((T − 20)/10), с⁻¹ */
export const rateConstant = ({ T, c }: Run) => RATE.k0 * c * RATE.gamma ** ((T - 20) / 10);

/** Сутек көлемі: V(t) = V_max · (1 − e^(−k·t)), мл */
export const volumeAt = (run: Run, t: number) => vMaxMl() * (1 - Math.exp(-rateConstant(run) * t));

/** Бастапқы жылдамдық v₀ = V_max · k, мл/с */
export const initialRate = (run: Run) => vMaxMl() * rateConstant(run);

/** Жартылай уақыт t½ = ln 2 / k, с */
export const halfLife = (run: Run) => Math.LN2 / rateConstant(run);

export const isValidRun = ({ T, c }: Run) =>
  (TEMPERATURES as readonly number[]).includes(T) && (CONCENTRATIONS as readonly number[]).includes(c);

/** «Бір уақытта тек бір параметр» ережесі: алдыңғы жүгіртілімнен екеуі де өзгерді ме */
export const bothChanged = (previous: Run | undefined, next: Run) => Boolean(previous && previous.T !== next.T && previous.c !== next.c);

export const countViolations = (runs: readonly Run[]) => runs.filter((run, i) => bothChanged(runs[i - 1], run)).length;

/** Салыстыру жұптары: тек температура өзгерген және тек концентрация өзгерген екі жүгіртілім бар ма */
export function comparisonPairs(runs: readonly Run[]) {
  let temperature = false;
  let concentration = false;
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      if (runs[i].c === runs[j].c && runs[i].T !== runs[j].T) temperature = true;
      if (runs[i].T === runs[j].T && runs[i].c !== runs[j].c) concentration = true;
    }
  }
  return { temperature, concentration };
}
