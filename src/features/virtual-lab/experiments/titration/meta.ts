/**
 * Титрлеу тәжірибесінің клиентке ашық сипаттамасы (мәтіндер — ChemLab.labs.titration.*).
 * Мұнда дұрыс жауаптар ЖОҚ: құралдардың қайсысы керек, сұрақтардың жауабы — grade.ts (тек серверде).
 */
export const TITRATION_META = {
  /** Құралдар (дұрыстары мен алаңдатқыштар аралас; рет әдейі шашыраңқы) */
  equipment: ["pipette", "magnet", "burette", "thermometer", "conical-flask", "filter-paper", "phenolphthalein"],
  /** Болжам: эквивалент нүктесінде pH қандай болады? */
  predictions: ["lt7", "eq7", "gt7"],
  questions: [
    { id: "concentration", kind: "number", unit: "М" },
    { id: "equivalence", kind: "number", unit: "мл" },
    { id: "eqMedium", kind: "choice", options: ["acid", "neutral", "base"] },
  ],
  /** Бақылау кестесіндегі оқушы таңдайтын мәндер */
  colors: ["colorless", "crimson"],
  media: ["acid", "neutral", "base"],
} as const;

export type TitrationEquipment = (typeof TITRATION_META.equipment)[number];
