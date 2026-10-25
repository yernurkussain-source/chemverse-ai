/**
 * «Металдардың белсенділігі»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.metal-activity.*).
 * Дұрыс жауаптар мұнда ЖОҚ — grade.ts (тек серверде).
 */
export const ACTIVITY_META = {
  equipment: ["test-tubes", "rack", "tweezers", "sandpaper", "scales", "burner", "funnel", "magnet", "goggles"],
  predictions: ["silver", "nothing", "gas", "dissolve"],
  questions: [
    { id: "order", kind: "choice", options: ["cuFeZnMg", "znMgFeCu", "mgZnFeCu", "feZnMgCu"] },
    { id: "copper", kind: "choice", options: ["soft", "position", "acid", "silver"] },
    { id: "h2Volume", kind: "number" },
  ],
  /** Бақылау кестесі: неше ерітіндімен әрекеттесті (0–3) және белсенділік орны (1–4) */
  reactionCounts: ["0", "1", "2", "3"],
  ranks: ["1", "2", "3", "4"],
} as const;

export type ActivityEquipment = (typeof ACTIVITY_META.equipment)[number];

/** Белсенділік қатары нұсқалары — формулалар, аударылмайды */
export const ORDER_OPTIONS: Record<(typeof ACTIVITY_META.questions)[0]["options"][number], string> = {
  cuFeZnMg: "Cu > Fe > Zn > Mg",
  znMgFeCu: "Zn > Mg > Fe > Cu",
  mgZnFeCu: "Mg > Zn > Fe > Cu",
  feZnMgCu: "Fe > Zn > Mg > Cu",
};
