/**
 * «Реакция жылдамдығы»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.reaction-rate.*).
 * Дұрыс жауаптар мұнда ЖОҚ — grade.ts (тек серверде).
 */
export const RATE_META = {
  equipment: ["thermometer", "magnet", "gas-syringe", "porcelain-dish", "conical-flask", "stopwatch", "filter-paper", "cylinder"],
  predictions: ["faster", "slower", "same"],
  questions: [
    { id: "tempFactor", kind: "number" },
    { id: "halfLife", kind: "choice", options: ["doubled", "halved", "same", "quartered"] },
    { id: "finalVolume", kind: "choice", options: ["acidRunsOut", "syringeFull", "mgLimiting", "sameTemp"] },
  ],
} as const;

export type RateEquipment = (typeof RATE_META.equipment)[number];
