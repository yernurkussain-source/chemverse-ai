import { phenolphthaleinColor } from "@/lib/chemistry/titration";

/**
 * «Индикатор зертханасы» моделі (docs/chemlab/CHEMLAB_SPEC.md 5.3) — таза функциялар.
 * 6 белгісіз ерітінді A–F пробиркаларында (реті әр жолы араласады), 4 индикатор.
 */
export const SOLUTIONS = [
  { id: "hcl", pH: 2.0, medium: "acid" },
  { id: "lemon", pH: 2.4, medium: "acid" },
  { id: "water", pH: 7.0, medium: "neutral" },
  { id: "nacl", pH: 7.0, medium: "neutral" },
  { id: "soda", pH: 8.4, medium: "base" },
  { id: "naoh", pH: 12.0, medium: "base" },
] as const;
export type SolutionId = (typeof SOLUTIONS)[number]["id"];
export type Medium = (typeof SOLUTIONS)[number]["medium"];

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

/** Индикатордың pH бойынша түсі (spec кестесі) */
export function indicatorColor(indicator: Indicator, pH: number): IndicatorColor {
  switch (indicator) {
    case "litmus":
      return color(pH < 4.5 ? "red" : pH <= 8.3 ? "purple" : "blue");
    case "phenolphthalein": {
      // 8,2–10 аралығында біртіндеп боялады (титрлеудегі функциямен бірдей)
      const { rgb, opacity } = phenolphthaleinColor(pH);
      const name: ColorName = pH < 8.2 ? "colorless" : pH < 10 ? "palePink" : "crimson";
      return { name, rgb, opacity: pH < 8.2 ? 0.25 : opacity };
    }
    case "methylOrange":
      return color(pH < 3.1 ? "red" : pH <= 4.4 ? "orange" : "yellow");
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
