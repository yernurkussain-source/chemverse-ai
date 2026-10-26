/** «Массалық үлес»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.mass-fraction.*). Жауаптар — grade.ts */
export const MASS_FRACTION_META = {
  equipment: ["scales", "cylinder", "beaker", "stirrer", "spatula", "goggles", "burner", "funnel"],
  predictions: ["right", "tooMuchSalt", "tooMuchWater"],
  questions: [
    { id: "dilute", kind: "number" },
    { id: "evaporate", kind: "choice", options: ["decreases", "same", "increases"] },
    { id: "fraction", kind: "number" },
  ],
} as const;

export type MassFractionEquipment = (typeof MASS_FRACTION_META.equipment)[number];
