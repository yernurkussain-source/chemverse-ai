/**
 * «Қоспаны бөлу» тәжірибесінің клиентке ашық сипаттамасы (мәтіндер — ChemLab.labs.mixture-separation.*).
 * Дұрыс жауаптар мұнда ЖОҚ — grade.ts (тек серверде).
 */
export const MIXTURE_META = {
  equipment: ["funnel", "magnet", "beaker", "hotplate", "dropper", "glass-rod", "porcelain-dish"],
  predictions: ["magnet", "dissolve", "sieve", "heat"],
  questions: [
    { id: "fraction", kind: "number", unit: "%" },
    { id: "yield", kind: "number", unit: "%" },
    { id: "whySand", kind: "choice", options: ["insoluble", "heavy", "magnetic", "crystal"] },
  ],
  places: ["beaker", "filter", "filtrate", "dish"],
  soluble: ["yes", "no"],
} as const;

export type MixtureEquipment = (typeof MIXTURE_META.equipment)[number];
