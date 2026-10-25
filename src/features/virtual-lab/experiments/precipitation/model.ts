import { addLiquid, liquidColor, newVessel, PPT, type Ions, type PptId, type RGBA } from "@/features/chem-engine";

/**
 * «Тұнба түзілуі» моделі (алмасу реакциялары, 9-сынып) — таза функциялар.
 * 4 тұз ерітіндісі × 3 реактив = 12 пробирка; тұнбаны ортақ химия қозғалтқышы есептейді (3D зертханамен бірдей).
 * Жұптар қозғалтқыш дұрыс сипаттайтындай таңдалған: Ag⁺ сульфатпен не карбонатпен кездеспейді
 * (Ag₂SO₄, Ag₂CO₃ қозғалтқышта жоқ); ерітінділер 0,1 М — Ba(OH)₂ бұл концентрацияда тұнба бермейді.
 */
export const SALTS = [
  { id: "BaCl2", f: "BaCl₂", ions: { Ba: 0.1, Cl: 0.2 } },
  { id: "CuCl2", f: "CuCl₂", ions: { Cu: 0.1, Cl: 0.2 } },
  { id: "FeCl3", f: "FeCl₃", ions: { Fe3: 0.1, Cl: 0.3 } },
  { id: "MgCl2", f: "MgCl₂", ions: { Mg: 0.1, Cl: 0.2 } },
] as const satisfies readonly { id: string; f: string; ions: Ions }[];

export const REAGENTS = [
  { id: "NaOH", f: "NaOH", ions: { Na: 0.1, OH: 0.1 } },
  { id: "Na2SO4", f: "Na₂SO₄", ions: { Na: 0.2, SO4: 0.1 } },
  { id: "AgNO3", f: "AgNO₃", ions: { Ag: 0.1, NO3: 0.1 } },
] as const satisfies readonly { id: string; f: string; ions: Ions }[];

/** Пробирка нөмірі: тұз × 3 + реактив (0…11) */
export const CELLS = SALTS.flatMap((_, salt) => REAGENTS.map((_, reagent) => ({ salt, reagent })));

/** Бақылау кестесінде таңдалатын тұнбалар (none — тұнба жоқ) */
export const PRECIPITATES = ["AgCl", "BaSO4", "CuOH2", "FeOH3", "MgOH2"] as const satisfies readonly PptId[];
export type Precipitate = (typeof PRECIPITATES)[number];
export type PptChoice = Precipitate | "none";

/** Тұнбаның түсінің атауы (аударма кілті) */
export const PPT_COLOR: Record<Precipitate, "white" | "blue" | "brown"> = {
  AgCl: "white",
  BaSO4: "white",
  CuOH2: "blue",
  FeOH3: "brown",
  MgOH2: "white",
};

export type MixResult = { ppt: Precipitate | null; liquid: RGBA };

/** 2 мл тұз ерітіндісіне 2 мл реактив құю: қандай тұнба түзіледі (қозғалтқыш бойынша) */
export function mix(cell: number): MixResult {
  const { salt, reagent } = CELLS[cell];
  const tube = newVessel("tube", 20, "tube");
  addLiquid(tube, SALTS[salt].ions, 2);
  addLiquid(tube, REAGENTS[reagent].ions, 2);
  const ppt = PRECIPITATES.find((p) => (tube.ppt[p] ?? 0) > 1e-9) ?? null;
  return { ppt, liquid: liquidColor(tube) };
}

/** Тұнбаның формуласы (интерфейсте) */
export const pptFormula = (p: Precipitate) => PPT[p].f;

export const testedCells = (mixed: readonly number[]) => new Set(mixed).size;
