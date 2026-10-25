/**
 * «Коэффициенттерді таңдау»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.balance-equations.*).
 * Дұрыс жауаптар мұнда ЖОҚ — grade.ts (тек серверде).
 */
export const BALANCE_META = {
  /** «Құралдар» қадамы: теңестіру үшін не керек (артықтары бар) */
  equipment: ["coefficients", "indices", "atom-count", "new-substance", "conservation", "remove-substance"],
  predictions: ["1", "2", "3", "4"],
  questions: [
    { id: "indices", kind: "choice", options: ["easier", "substance", "mass", "rule"] },
    { id: "law", kind: "choice", options: ["periodic", "composition", "conservation", "avogadro"] },
    { id: "waterMass", kind: "number" },
  ],
} as const;

export type BalanceEquipment = (typeof BALANCE_META.equipment)[number];
