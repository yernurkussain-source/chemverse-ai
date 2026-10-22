/**
 * «Индикатор зертханасы»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.indicator-lab.*).
 * Дұрыс жауаптар мұнда ЖОҚ — grade.ts (тек серверде).
 */
export const INDICATOR_META = {
  equipment: ["burner", "test-tubes", "filter-paper", "dropper", "thermometer", "indicators", "goggles"],
  predictions: ["acid", "neutral", "base"],
  questions: [
    { id: "phenol", kind: "choice", options: ["reacts", "colorless", "noIons", "weak"] },
    { id: "higherPh", kind: "choice", options: ["soda", "naoh", "same"] },
    { id: "whichIndicator", kind: "choice", options: ["phenolphthalein", "litmus", "universal", "methylOrange"] },
  ],
  media: ["acid", "neutral", "base"],
} as const;

export type IndicatorEquipment = (typeof INDICATOR_META.equipment)[number];
