import { addLiquid, ION, newVessel, type IonId, type Ions, type PptId } from "@/features/chem-engine";
import { chooseFlame } from "@/features/virtual-lab-3d/game/flame-rules";

/**
 * «Белгісіз затты анықтау» моделі (9–10-сынып) — таза функциялар.
 * X — 7 тұздың бірі (0,1 М). Сынақтарды ортақ химия қозғалтқышы мен 3D зертхананың жалын ережесі есептейді.
 * X-тің өзі клиентке берілмейді: сынақ нәтижесін сервер қайтарады (unknown-action.ts).
 * Жұптар қозғалтқыш дұрыс сипаттайтындай таңдалған: AgNO₃ азот қышқылымен (карбонат CO₂ болып кетеді,
 * Ag₂SO₄ сұйылтылған ерітіндіде тұнбаға түспейді), NaOH 0,1 М (Ba(OH)₂ тұнба бермейді).
 */
type Part = readonly [IonId, number];

export const CANDIDATES = [
  { id: "NaCl", f: "NaCl", parts: [["Na", 1], ["Cl", 1]] },
  { id: "KI", f: "KI", parts: [["K", 1], ["I", 1]] },
  { id: "BaCl2", f: "BaCl₂", parts: [["Ba", 1], ["Cl", 2]] },
  { id: "CuSO4", f: "CuSO₄", parts: [["Cu", 1], ["SO4", 1]] },
  { id: "FeCl3", f: "FeCl₃", parts: [["Fe3", 1], ["Cl", 3]] },
  { id: "Na2CO3", f: "Na₂CO₃", parts: [["Na", 2], ["CO3", 1]] },
  { id: "Na2SO4", f: "Na₂SO₄", parts: [["Na", 2], ["SO4", 1]] },
] as const satisfies readonly { id: string; f: string; parts: readonly [Part, Part] }[];
export type CandidateId = (typeof CANDIDATES)[number]["id"];

const CONCENTRATION = 0.1;
const ionsOf = (x: number): Ions => Object.fromEntries(CANDIDATES[x].parts.map(([ion, k]) => [ion, CONCENTRATION * k]));

/** Молярлық масса, г/моль (қозғалтқыштың иондар кестесінен) */
export const molarMass = (x: number) => Math.round(CANDIDATES[x].parts.reduce((m, [ion, k]) => m + ION[ion].M * k, 0) * 100) / 100;

export const TESTS = ["flame", "naoh", "agno3", "bacl2", "hcl"] as const;
export type UnknownTest = (typeof TESTS)[number];
export const isUnknownTest = (v: unknown): v is UnknownTest => (TESTS as readonly unknown[]).includes(v);

/** Реактивтер: 1 литрдегі иондар (AgNO₃ 0,02 М + HNO₃ 0,5 М) */
const REAGENT: Record<Exclude<UnknownTest, "flame">, Ions> = {
  naoh: { Na: 0.1, OH: 0.1 },
  agno3: { Ag: 0.02, NO3: 0.52, H: 0.5 },
  bacl2: { Ba: 0.1, Cl: 0.2 },
  hcl: { H: 1, Cl: 1 },
};

export const SEEN = ["white", "yellow", "blue", "brown", "gas", "none", "flameNa", "flameK", "flameCa", "flameBa", "flameCu", "flameNone"] as const;
export type Seen = (typeof SEEN)[number];

const PPT_SEEN: Partial<Record<PptId, Seen>> = { AgI: "yellow", CuOH2: "blue", FeOH3: "brown" };

/** X-пен сынақ: не байқалады */
export function observe(x: number, test: UnknownTest): Seen {
  if (test === "flame") {
    const { main } = chooseFlame(CANDIDATES[x].parts.map(([ion]) => ion), false);
    return main ? `flame${main}` : "flameNone";
  }
  const tube = newVessel("tube", 20, "tube");
  addLiquid(tube, ionsOf(x), 2);
  addLiquid(tube, REAGENT[test], 2);
  if ((tube.gasOut?.CO2 ?? 0) > 1e-9) return "gas";
  const ppt = (Object.keys(tube.ppt) as PptId[]).find((p) => (tube.ppt[p] ?? 0) > 1e-9);
  return ppt ? (PPT_SEEN[ppt] ?? "white") : "none";
}

/** Бақылау кестесінде таңдалатын иондар */
export const ION_CHOICES = ["Na", "K", "Ba", "Cu", "Fe3", "Cl", "I", "SO4", "CO3", "none"] as const;
export type IonChoice = (typeof ION_CHOICES)[number];

/** Сынақ қай ионды көрсетеді: жалын мен NaOH — катионды, қалғандары — анионды; өзгеріс болмаса — ештеңе */
export function revealedIon(x: number, test: UnknownTest): IonChoice {
  const seen = observe(x, test);
  if (seen === "none" || seen === "flameNone") return "none";
  const [cation, anion] = CANDIDATES[x].parts;
  return (test === "flame" || test === "naoh" ? cation[0] : anion[0]) as IonChoice;
}

export const ionLabel = (ion: IonChoice) => (ion === "none" ? null : ION[ion].f);
