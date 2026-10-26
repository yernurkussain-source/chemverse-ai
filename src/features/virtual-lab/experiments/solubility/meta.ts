/** «Ерігіштік»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.solubility.*). Жауаптар — grade.ts */
export const SOLUBILITY_META = {
  equipment: ["beaker", "scales", "thermometer", "stirrer", "hotplate", "goggles", "funnel", "magnet"],
  predictions: ["increases", "same", "decreases"],
  questions: [
    { id: "trend", kind: "choice", options: ["sharply", "barely", "decreases"] },
    { id: "recrystal", kind: "choice", options: ["KNO3", "NaCl", "both"] },
    { id: "crystals", kind: "number" },
  ],
} as const;

export type SolubilityEquipment = (typeof SOLUBILITY_META.equipment)[number];
