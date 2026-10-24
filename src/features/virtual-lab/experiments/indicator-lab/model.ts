import { addLiquid, INDICATOR_RANGES, newVessel, pH, type Ions } from "@/features/chem-engine";
import { phenolphthaleinColor } from "@/lib/chemistry/titration";

/**
 * «Индикатор зертханасы» моделі (docs/chemlab/CHEMLAB_SPEC.md 5.3) — таза функциялар.
 * 6 белгісіз ерітінді A–F пробиркаларында (реті әр жолы араласады), 4 индикатор.
 * Ерітінділердің pH-ын ортақ химия қозғалтқышы құрамы бойынша есептейді (3D зертханамен бірдей модель).
 */

/** Ерітіндінің pH-ы қозғалтқыш бойынша (ions — 1 литрдегі иондар, моль/л), 2 таңбаға дейін дөңгелектелген */
const enginePH = (ions: Ions) => {
  const tube = newVessel("tube", 20, "tube");
  addLiquid(tube, ions, 10);
  return Math.round(pH(tube)! * 100) / 100;
};

export const SOLUTIONS = [
  { id: "hcl", pH: enginePH({ H: 0.01, Cl: 0.01 }), medium: "acid" },
  // Лимон шырыны — әлсіз органикалық қышқыл (лимон қышқылы): қозғалтқыш тек күшті қышқылдарды
  // есептейді, сондықтан мұнда өлшенген мән беріледі
  { id: "lemon", pH: 2.4, medium: "acid" },
  { id: "water", pH: enginePH({}), medium: "neutral" },
  { id: "nacl", pH: enginePH({ Na: 0.1, Cl: 0.1 }), medium: "neutral" },
  // Ас содасы — NaHCO₃ 0,1 М: гидрокарбонат ерітіндісінің pH-ы ≈ 8,34
  { id: "soda", pH: enginePH({ Na: 0.1, HCO3: 0.1 }), medium: "base" },
  { id: "naoh", pH: enginePH({ Na: 0.01, OH: 0.01 }), medium: "base" },
] as const;
export type SolutionId = (typeof SOLUTIONS)[number]["id"];
export type Medium = (typeof SOLUTIONS)[number]["medium"];

/** Ортаның түрі pH бойынша (мектеп курсындағы жіктеу: 7-ге жақын — бейтарап), титрлеудегімен бірдей */
export const mediumOf = (p: number): Medium => (p < 6.5 ? "acid" : p <= 7.5 ? "neutral" : "base");

export const TUBES = ["A", "B", "C", "D", "E", "F"] as const;
export const INDICATORS = ["litmus", "phenolphthalein", "methylOrange", "universal"] as const;
export type Indicator = (typeof INDICATORS)[number];

/** Түстің атауы (аударма кілті) және сызуға арналған түсі */
export type IndicatorColor = { name: ColorName; rgb: string; opacity: number };
export type ColorName =
  | "red"
  | "purple"
  | "blue"
  | "colorless"
  | "palePink"
  | "crimson"
  | "orange"
  | "yellow"
  | "green"
  | "teal"
  | "blueViolet"
  | "violet";

const RGB: Record<ColorName, string> = {
  red: "rgb(220,38,60)",
  purple: "rgb(124,58,160)",
  blue: "rgb(37,99,215)",
  colorless: "rgb(200,225,240)",
  palePink: "rgb(255,150,200)",
  crimson: "rgb(255,40,140)",
  orange: "rgb(245,130,30)",
  yellow: "rgb(245,205,40)",
  green: "rgb(40,170,80)",
  teal: "rgb(20,150,160)",
  blueViolet: "rgb(80,70,200)",
  violet: "rgb(130,40,170)",
};

const color = (name: ColorName, opacity = 0.8): IndicatorColor => ({ name, rgb: RGB[name], opacity });

/**
 * Индикатордың pH бойынша түсі (spec кестесі). Лакмус, фенолфталеин, метилоранждың ауысу аралығы —
 * қозғалтқыштан (INDICATOR_RANGES); әмбебап индикатордың түс шкаласы — мектептегі қорапшадағы кесте.
 */
export function indicatorColor(indicator: Indicator, pH: number): IndicatorColor {
  switch (indicator) {
    case "litmus": {
      const [lo, hi] = INDICATOR_RANGES.lit;
      return color(pH < lo ? "red" : pH <= hi ? "purple" : "blue");
    }
    case "phenolphthalein": {
      // 8,2–10 аралығында біртіндеп боялады (титрлеудегі функциямен бірдей)
      const [lo, hi] = INDICATOR_RANGES.php;
      const { rgb, opacity } = phenolphthaleinColor(pH);
      const name: ColorName = pH < lo ? "colorless" : pH < hi ? "palePink" : "crimson";
      return { name, rgb, opacity: pH < lo ? 0.25 : opacity };
    }
    case "methylOrange": {
      const [lo, hi] = INDICATOR_RANGES.mo;
      return color(pH < lo ? "red" : pH <= hi ? "orange" : "yellow");
    }
    case "universal":
      if (pH < 2.5) return color("red");
      if (pH < 4.5) return color("orange");
      if (pH < 6.5) return color("yellow");
      if (pH < 7.5) return color("green");
      if (pH < 9.5) return color("teal");
      if (pH < 12.5) return color("blueViolet");
      return color("violet");
  }
}

/** Пробиркалардағы ерітінділер: params.t0…t5 = SOLUTIONS индексі (серверде араластырылады) */
export function tubeSolutions(params: Record<string, number>) {
  return TUBES.map((_, i) => SOLUTIONS[params[`t${i}`]] ?? SOLUTIONS[i]);
}

/** Араластыру дұрыс па: 0…5 сандарының әрқайсысы бір рет */
export function isValidOrder(params: Record<string, number>) {
  const values = TUBES.map((_, i) => params[`t${i}`]);
  return values.every((v) => Number.isInteger(v) && v >= 0 && v < SOLUTIONS.length) && new Set(values).size === SOLUTIONS.length;
}

export type Trial = { tube: number; indicator: Indicator };

/** Әр пробиркада байқалған түстер (бақылау кестесі үшін) */
export function observedColors(params: Record<string, number>, trials: readonly Trial[]) {
  const solutions = tubeSolutions(params);
  return TUBES.map((_, tube) => {
    const seen = new Map<Indicator, ColorName>();
    for (const trial of trials) if (trial.tube === tube) seen.set(trial.indicator, indicatorColor(trial.indicator, solutions[tube].pH).name);
    return [...seen];
  });
}

export const testedTubes = (trials: readonly Trial[]) => new Set(trials.map((t) => t.tube)).size;
