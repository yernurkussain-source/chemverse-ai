/** «Өлшеулер»: клиентке ашық сипаттама (мәтіндер — ChemLab.labs.measurements.*). Жауаптар — grade.ts */
export const MEASURE_META = {
  equipment: ["scales", "cylinder", "beaker", "thread", "burner", "thermometer", "funnel"],
  predictions: ["displacement", "ruler", "scales"],
  questions: [
    { id: "meniscus", kind: "choice", options: ["top", "bottom", "any"] },
    { id: "tare", kind: "choice", options: ["faster", "container", "battery"] },
    { id: "bodyVolume", kind: "number" },
  ],
} as const;

export type MeasureEquipment = (typeof MEASURE_META.equipment)[number];
