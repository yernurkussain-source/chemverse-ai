/**
 * «Белгісіз затты анықтау»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.unknown-substance.*).
 * Дұрыс жауаптар мұнда ЖОҚ — grade.ts (тек серверде).
 */
export const UNKNOWN_META = {
  equipment: ["test-tubes", "rack", "dropper", "nichrome", "burner", "thermometer", "funnel", "magnet", "goggles"],
  predictions: ["cation", "anion", "both", "none"],
  hno3Options: ["faster", "carbonate", "color", "dissolve"],
} as const;

export type UnknownEquipment = (typeof UNKNOWN_META.equipment)[number];
