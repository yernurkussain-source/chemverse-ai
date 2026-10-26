import type { MoleculeId } from "@/lib/chemistry/molecules";

/**
 * «Органикалық конструктор: изомерлер» (10-сынып): үш изомер жұбын құрастыру —
 * C₄H₁₀ (бутан, изобутан), C₂H₆O (этанол, диметил эфирі), C₃H₆O (пропаналь, ацетон).
 * Құрылымды молекула құрастырушы таниды (PubChem құрылымдарымен граф бойынша салыстыру).
 */
export const TARGETS = ["butane", "isobutane", "ethanol", "dimethyl-ether", "propanal", "acetone"] as const satisfies readonly MoleculeId[];
export const CLASSES = ["alkane", "alcohol", "ether", "aldehyde", "ketone"] as const;

export const isTarget = (id: unknown): id is (typeof TARGETS)[number] => (TARGETS as readonly unknown[]).includes(id);
export const foundOf = (value: unknown): (typeof TARGETS)[number][] => (Array.isArray(value) ? [...new Set(value.filter(isTarget))] : []);
