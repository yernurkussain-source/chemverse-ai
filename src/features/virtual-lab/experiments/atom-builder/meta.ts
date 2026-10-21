/**
 * «Атом құрылысы» тәжірибесінің клиентке ашық сипаттамасы (мәтіндер — ChemLab.labs.atom-builder.*).
 * Дұрыс жауаптар мұнда ЖОҚ — grade.ts (тек серверде).
 */
export const ATOM_META = {
  /** «Құралдар» қадамы: атомды құрайтын бөлшектерді таңдау (артықтары бар) */
  equipment: ["photon", "proton", "molecule", "neutron", "ion", "electron"],
  predictions: ["element", "charge", "mass"],
  questions: [
    { id: "identity", kind: "choice", options: ["neutrons", "protons", "electrons", "mass"] },
    { id: "magnesium", kind: "choice", options: ["2,10", "2,8,2", "2,8,1,1", "8,4"] },
    { id: "oxideElectrons", kind: "number" },
  ],
  /** Бақылау кестесіндегі заряд нұсқалары */
  charges: ["2-", "1-", "0", "1+", "2+"],
} as const;

export type AtomEquipment = (typeof ATOM_META.equipment)[number];

/** "1+" → +1, "2-" → −2 */
export const chargeFromOption = (option: string) => {
  const m = /^(\d)([+-])$/.exec(option);
  if (option === "0") return 0;
  return m ? Number(m[1]) * (m[2] === "+" ? 1 : -1) : null;
};
export const optionFromCharge = (charge: number) => (charge === 0 ? "0" : `${Math.abs(charge)}${charge > 0 ? "+" : "-"}`);
