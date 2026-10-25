/**
 * «Тұнба түзілуі»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.precipitation.*).
 * Дұрыс жауаптар мұнда ЖОҚ — grade.ts (тек серверде).
 */
export const PRECIPITATION_META = {
  equipment: ["test-tubes", "rack", "dropper", "burner", "thermometer", "scales", "goggles", "gloves"],
  predictions: ["bluePpt", "whitePpt", "gas", "nothing"],
  questions: [
    { id: "ionic", kind: "choice", options: ["nacl", "baso4", "bacl2", "na2so4"] },
    { id: "silver", kind: "choice", options: ["silver", "chloride", "nitrate", "water"] },
    { id: "pptMass", kind: "number" },
  ],
} as const;

export type PrecipitationEquipment = (typeof PRECIPITATION_META.equipment)[number];

/** Иондық теңдеу нұсқалары — формулалар, аударылмайды */
export const IONIC_OPTIONS: Record<(typeof PRECIPITATION_META.questions)[0]["options"][number], string> = {
  nacl: "Na⁺ + Cl⁻ → NaCl↓",
  baso4: "Ba²⁺ + SO₄²⁻ → BaSO₄↓",
  bacl2: "Ba²⁺ + 2Cl⁻ → BaCl₂↓",
  na2so4: "2Na⁺ + SO₄²⁻ → Na₂SO₄↓",
};
