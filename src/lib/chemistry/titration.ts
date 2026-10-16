/**
 * Күшті қышқылды күшті негізбен титрлеу: HCl (25 мл, 0,1 М) + NaOH (0,1 М).
 * Формулалар prototype.html-дегі есептеумен бірдей.
 */
export const TITRATION = {
  acidVolumeMl: 25,
  concentration: 0.1,
  maxVolumeMl: 50,
  dropMl: 0.05,
  equivalenceMl: 25,
} as const;

/** Судың иондық көбейтіндісі (25 °C) */
const KW = 1e-14;

/**
 * v мл NaOH қосылғандағы pH.
 * Электрбейтараптық теңдеуі: [H⁺] − Kw/[H⁺] = d, мұндағы d — артық H⁺ концентрациясы
 * (d < 0 болса — артық OH⁻). Квадрат теңдеудің оң түбірі алынады.
 */
export function titrationPH(v: number): number {
  const { acidVolumeMl, concentration } = TITRATION;
  const nH = (concentration * acidVolumeMl) / 1000;
  const nOH = (concentration * v) / 1000;
  const totalLiters = (acidVolumeMl + v) / 1000;
  const d = (nH - nOH) / totalLiters;
  const root = Math.sqrt(d * d + 4 * KW);
  // d < 0 кезінде дөңгелектеу қатесі болмауы үшін баламалы формула
  const h = d >= 0 ? (d + root) / 2 : (2 * KW) / (root - d);
  return -Math.log10(h);
}

/** Фенолфталеин: pH 8,2-ден төмен — түссіз, 10-нан жоғары — таңқурай түсті */
export function phenolphthaleinColor(pH: number): { rgb: string; opacity: number } {
  const t = Math.max(0, Math.min(1, (pH - 8.2) / 1.8));
  const from = [150, 205, 230];
  const to = [255, 40, 140];
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * t)).join(",");
  return { rgb: `rgb(${rgb})`, opacity: 0.35 + (0.82 - 0.35) * t };
}

/** Ерітінді ортасы — интерфейстегі жазу мен түс үшін */
export type MediumState = "acid" | "equivalence" | "weakBase" | "base";

export function mediumState(v: number, pH: number): MediumState {
  if (Math.abs(v - TITRATION.equivalenceMl) < 0.03) return "equivalence";
  if (pH < 7) return "acid";
  return pH >= 8.2 ? "base" : "weakBase";
}
