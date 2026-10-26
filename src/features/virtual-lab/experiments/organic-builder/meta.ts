/** «Органикалық конструктор»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.organic-builder.*). Жауаптар — grade.ts */
export const ORGANIC_BUILDER_META = {
  equipment: ["carbon", "hydrogen", "oxygen", "bonds", "nitrogen", "chlorine", "burner"],
  predictions: ["1", "2", "4"],
  questions: [
    { id: "isomers", kind: "choice", options: ["sameStructure", "sameFormula", "sameProperties"] },
    { id: "sodium", kind: "choice", options: ["ethanol", "ether", "both"] },
    { id: "molarMass", kind: "number" },
  ],
} as const;

export type OrganicBuilderEquipment = (typeof ORGANIC_BUILDER_META.equipment)[number];
