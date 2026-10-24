import { addLiquid, INDICATOR_RANGES, newVessel, pH } from "@/features/chem-engine";

/**
 * Күшті қышқылды күшті негізбен титрлеу: HCl (25 мл, 0,1 М) + NaOH (0,1 М).
 * pH-ты ортақ химия қозғалтқышы (src/features/chem-engine) есептейді — 3D зертханамен бірдей модель.
 */
export const TITRATION = {
  acidVolumeMl: 25,
  concentration: 0.1,
  maxVolumeMl: 50,
  dropMl: 0.05,
  equivalenceMl: 25,
} as const;

/** Эквивалент нүктесі (мл NaOH): c(HCl)·V(HCl) = c(NaOH)·V(NaOH) */
export function equivalenceVolume(acidConcentration: number = TITRATION.concentration): number {
  return (acidConcentration * TITRATION.acidVolumeMl) / TITRATION.concentration;
}

/**
 * v мл NaOH қосылғандағы pH. acidConcentration — HCl концентрациясы (әдепкі 0,1 М;
 * виртуалды зертханада ол белгісіз, оқушы табуы керек).
 * Колбаға HCl құйылып, үстінен NaOH қосылады; бейтараптану мен pH-ты қозғалтқыш есептейді.
 */
export function titrationPH(v: number, acidConcentration: number = TITRATION.concentration): number {
  const flask = newVessel("flask", 100, "beaker");
  addLiquid(flask, { H: acidConcentration, Cl: acidConcentration }, TITRATION.acidVolumeMl);
  if (v > 0) addLiquid(flask, { Na: TITRATION.concentration, OH: TITRATION.concentration }, v);
  return pH(flask)!;
}

/** Фенолфталеин: ауысу аралығы қозғалтқыштан (8,2–10); 8,2-ден төмен — түссіз, 10-нан жоғары — таңқурай түсті */
export function phenolphthaleinColor(pH: number): { rgb: string; opacity: number } {
  const [lo, hi] = INDICATOR_RANGES.php;
  const t = Math.max(0, Math.min(1, (pH - lo) / (hi - lo)));
  const from = [150, 205, 230];
  const to = [255, 40, 140];
  const rgb = from.map((c, i) => Math.round(c + (to[i] - c) * t)).join(",");
  return { rgb: `rgb(${rgb})`, opacity: 0.35 + (0.82 - 0.35) * t };
}

/** Ерітінді ортасы — интерфейстегі жазу мен түс үшін */
export type MediumState = "acid" | "equivalence" | "weakBase" | "base";

export function mediumState(v: number, pH: number, equivalenceMl: number = TITRATION.equivalenceMl): MediumState {
  if (Math.abs(v - equivalenceMl) < 0.03) return "equivalence";
  if (pH < 7) return "acid";
  return pH >= INDICATOR_RANGES.php[0] ? "base" : "weakBase";
}
