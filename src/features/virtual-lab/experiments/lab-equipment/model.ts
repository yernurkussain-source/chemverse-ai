import type { MatrixSpec } from "../../matrix/spec";

/**
 * «Зертханалық құралдар» (7-сынып): 8 жұмыс, әрқайсысына 3 құрал ұсынылады — дұрысын таңда.
 * Модель әр таңдаудың салдарын түсіндіреді (choose режимі: қате таңдау бағалауда −3).
 */
export const TASKS = ["measureVolume", "heatTube", "filter", "weigh", "evaporate", "grind", "addDrops", "takeSolid"] as const;

/** Әр жұмыстың нұсқалары; бірінші емес, ретті араластырып жазылған — дұрысы CORRECT-та */
const OPTIONS: Record<(typeof TASKS)[number], readonly string[]> = {
  measureVolume: ["beaker", "cylinder", "flask"],
  heatTube: ["hand", "crucibleTongs", "holder"],
  filter: ["funnel", "cylinder", "dropper"],
  weigh: ["ruler", "scales", "cylinder"],
  evaporate: ["cylinder", "funnel", "dish"],
  grind: ["mortar", "funnel", "beaker"],
  addDrops: ["spatula", "cylinder", "dropper"],
  takeSolid: ["hand", "spatula", "dropper"],
};

const CORRECT: Record<(typeof TASKS)[number], string> = {
  measureVolume: "cylinder",
  heatTube: "holder",
  filter: "funnel",
  weigh: "scales",
  evaporate: "dish",
  grind: "mortar",
  addDrops: "dropper",
  takeSolid: "spatula",
};

export const EQUIPMENT_SPEC: MatrixSpec = {
  rows: TASKS,
  tests: (row) => OPTIONS[TASKS[row]],
  mode: "choose",
  result: (row, test) => {
    const task = TASKS[row];
    return { seen: `${task}.${test}`, ok: CORRECT[task] === test };
  },
};

/** Бақылау кестесі: ыдыстарды қыздыруға бола ма */
export const GLASSWARE = ["cylinder", "beaker", "testTube", "flask", "dish", "funnel"] as const;
