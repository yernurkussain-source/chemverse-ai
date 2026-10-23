/**
 * «Реакция жылдамдығы» моделі (docs/chemlab/CHEMLAB_SPEC.md 5.4) — таза функциялар.
 * Mg + 2HCl → MgCl₂ + H₂↑. Магний 0,05 г (шектеуші), қышқыл артық.
 * Екі деңгей: 9-сынып — γ = 2 (белгілі); 10-сынып «Реакция кинетикасы» — γ жасырын (2–4), оқушы оны
 * деректерінен табады, реакция ретін анықтайды және модель шегінен тыс t½-ті болжайды.
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

/** Деңгейлер: сынып нөмірі (params.level) */
export const RATE_LEVELS = [9, 10] as const;
export type RateLevel = (typeof RATE_LEVELS)[number];
/** 10-сыныптағы жасырын γ нұсқалары (нақты реакцияларда γ ≈ 2–4) */
export const GAMMA_OPTIONS = [2.5, 3, 3.5, 4] as const;
/** 10-сынып: модельдің шегінен тыс болжау (сырғытпа 50 °C-қа дейін ғана) */
export const PREDICT_RUN: Run = { T: 60, c: 1 };

/** Тәжірибенің γ-сы: 10-сыныпта — серверде таңдалған (params.g), 9-сыныпта — 2 */
export const gammaOf = (params: Record<string, number>) => (params.level === 10 && params.g > 0 ? params.g : RATE.gamma);

export type Run = { T: number; c: number };

/** Соңғы көлем: V_max = m / M(Mg) · V_m, мл */
export const vMaxMl = () => (RATE.massMg / RATE.molarMg) * RATE.molarVolume * 1000;

/** Жылдамдық константасы: k = k₀ · c · γ^((T − 20)/10), с⁻¹ */
export const rateConstant = ({ T, c }: Run, gamma: number = RATE.gamma) => RATE.k0 * c * gamma ** ((T - 20) / 10);

/** Сутек көлемі: V(t) = V_max · (1 − e^(−k·t)), мл */
export const volumeAt = (run: Run, t: number, gamma: number = RATE.gamma) => vMaxMl() * (1 - Math.exp(-rateConstant(run, gamma) * t));

/** Бастапқы жылдамдық v₀ = V_max · k, мл/с */
export const initialRate = (run: Run, gamma: number = RATE.gamma) => vMaxMl() * rateConstant(run, gamma);

/** Жартылай уақыт t½ = ln 2 / k, с */
export const halfLife = (run: Run, gamma: number = RATE.gamma) => Math.LN2 / rateConstant(run, gamma);

/** Екі жүгіртілімнен γ: t½ қатынасы, 10 °C-қа келтірілген — γ = (t½₁ / t½₂)^(10 / ΔT) */
export function gammaFromRuns(a: Run, b: Run, gamma: number = RATE.gamma) {
  if (a.c !== b.c || a.T === b.T) return null;
  const [cold, hot] = a.T < b.T ? [a, b] : [b, a];
  return (halfLife(cold, gamma) / halfLife(hot, gamma)) ** (10 / (hot.T - cold.T));
}

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
