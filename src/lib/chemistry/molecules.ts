import type { Locale } from "@/i18n/routing";
import { formatShort } from "@/lib/format";
import { getElement } from "./elements";

export const MOLECULE_GROUPS = ["simple", "inorganic", "hydrocarbon", "organic", "bio", "crystal"] as const;
export type MoleculeGroup = (typeof MOLECULE_GROUPS)[number];

export type MoleculeId =
  | "h2"
  | "o2"
  | "n2"
  | "cl2"
  | "o3"
  | "h2o"
  | "co2"
  | "nh3"
  | "hcl"
  | "h2o2"
  | "co"
  | "so2"
  | "hno3"
  | "h2so4"
  | "h3po4"
  | "ch4"
  | "ethane"
  | "propane"
  | "butane"
  | "isobutane"
  | "ethylene"
  | "acetylene"
  | "benzene"
  | "methanol"
  | "ethanol"
  | "dimethyl-ether"
  | "glycerol"
  | "formaldehyde"
  | "acetic-acid"
  | "acetone"
  | "propanal"
  | "phenol"
  | "glucose"
  | "sucrose"
  | "urea"
  | "glycine"
  | "alanine"
  | "aspirin"
  | "vitamin-c"
  | "caffeine"
  | "nacl"
  | "diamond"
  | "graphite"
  | "ice"
  | "iron"
  | "copper";

export type Molecule = {
  id: MoleculeId;
  formula: string;
  /** Құрамы (формулалық бірлік): элемент белгісі → атом саны */
  atoms: Record<string, number>;
  group: MoleculeGroup;
  /** Байланыс бұрышы, градус (approx — «шамамен», ≈ белгісімен көрсетіледі); металл торында жоқ */
  angle?: { degrees: number; approx?: boolean };
  /** 3D құрылым файлы (public/molecules/sdf) */
  sdf: string;
  /** PubChem нөмірі (дереккөз); null — құрылым бағдарламамен есептелген (scripts/generated-sdf.mjs), generated — оның негізі */
  pubchemCid: number | null;
  generated?: { bond: string; length: number };
  /** Сутектік байланыстар үзік сызықпен көрсетіледі (мұз) */
  hydrogenBonds?: boolean;
  /** Басты беттегі 3D көріністе көрсетілетін молекулалар */
  featured?: boolean;
};

type Row = Omit<Molecule, "sdf">;
const sdf = (row: Row): Molecule => ({ ...row, sdf: `/molecules/sdf/${row.id}.sdf` });

const ROWS: Row[] = [
  // Жай заттар
  { id: "h2", formula: "H₂", atoms: { H: 2 }, group: "simple", angle: { degrees: 180 }, pubchemCid: null, generated: { bond: "H–H", length: 0.74 } },
  { id: "o2", formula: "O₂", atoms: { O: 2 }, group: "simple", angle: { degrees: 180 }, pubchemCid: 977 },
  { id: "n2", formula: "N₂", atoms: { N: 2 }, group: "simple", angle: { degrees: 180 }, pubchemCid: 947 },
  { id: "cl2", formula: "Cl₂", atoms: { Cl: 2 }, group: "simple", angle: { degrees: 180 }, pubchemCid: 24526 },
  { id: "o3", formula: "O₃", atoms: { O: 3 }, group: "simple", angle: { degrees: 116.8 }, pubchemCid: 24823 },
  // Бейорганикалық қосылыстар
  { id: "h2o", formula: "H₂O", atoms: { H: 2, O: 1 }, group: "inorganic", angle: { degrees: 104.5 }, pubchemCid: 962, featured: true },
  { id: "co2", formula: "CO₂", atoms: { C: 1, O: 2 }, group: "inorganic", angle: { degrees: 180 }, pubchemCid: 280, featured: true },
  { id: "nh3", formula: "NH₃", atoms: { N: 1, H: 3 }, group: "inorganic", angle: { degrees: 107 }, pubchemCid: 222, featured: true },
  { id: "hcl", formula: "HCl", atoms: { H: 1, Cl: 1 }, group: "inorganic", angle: { degrees: 180 }, pubchemCid: 313 },
  { id: "h2o2", formula: "H₂O₂", atoms: { H: 2, O: 2 }, group: "inorganic", angle: { degrees: 94.8 }, pubchemCid: 784 },
  { id: "co", formula: "CO", atoms: { C: 1, O: 1 }, group: "inorganic", angle: { degrees: 180 }, pubchemCid: 281 },
  { id: "so2", formula: "SO₂", atoms: { S: 1, O: 2 }, group: "inorganic", angle: { degrees: 119 }, pubchemCid: 1119 },
  { id: "hno3", formula: "HNO₃", atoms: { H: 1, N: 1, O: 3 }, group: "inorganic", angle: { degrees: 120, approx: true }, pubchemCid: 944 },
  { id: "h2so4", formula: "H₂SO₄", atoms: { H: 2, S: 1, O: 4 }, group: "inorganic", angle: { degrees: 109.5, approx: true }, pubchemCid: 1118 },
  { id: "h3po4", formula: "H₃PO₄", atoms: { H: 3, P: 1, O: 4 }, group: "inorganic", angle: { degrees: 109.5, approx: true }, pubchemCid: 1004 },
  // Көмірсутектер
  { id: "ch4", formula: "CH₄", atoms: { C: 1, H: 4 }, group: "hydrocarbon", angle: { degrees: 109.5 }, pubchemCid: 297, featured: true },
  { id: "ethane", formula: "C₂H₆", atoms: { C: 2, H: 6 }, group: "hydrocarbon", angle: { degrees: 109.5, approx: true }, pubchemCid: 6324 },
  { id: "propane", formula: "C₃H₈", atoms: { C: 3, H: 8 }, group: "hydrocarbon", angle: { degrees: 112, approx: true }, pubchemCid: 6334 },
  { id: "butane", formula: "CH₃(CH₂)₂CH₃", atoms: { C: 4, H: 10 }, group: "hydrocarbon", angle: { degrees: 112, approx: true }, pubchemCid: 7843 },
  { id: "isobutane", formula: "(CH₃)₃CH", atoms: { C: 4, H: 10 }, group: "hydrocarbon", angle: { degrees: 111, approx: true }, pubchemCid: 6360 },
  { id: "ethylene", formula: "C₂H₄", atoms: { C: 2, H: 4 }, group: "hydrocarbon", angle: { degrees: 120, approx: true }, pubchemCid: 6325 },
  { id: "acetylene", formula: "C₂H₂", atoms: { C: 2, H: 2 }, group: "hydrocarbon", angle: { degrees: 180 }, pubchemCid: 6326 },
  { id: "benzene", formula: "C₆H₆", atoms: { C: 6, H: 6 }, group: "hydrocarbon", angle: { degrees: 120 }, pubchemCid: 241, featured: true },
  // Оттекті органикалық қосылыстар
  { id: "methanol", formula: "CH₃OH", atoms: { C: 1, H: 4, O: 1 }, group: "organic", angle: { degrees: 109, approx: true }, pubchemCid: 887 },
  { id: "ethanol", formula: "C₂H₅OH", atoms: { C: 2, H: 6, O: 1 }, group: "organic", angle: { degrees: 109, approx: true }, pubchemCid: 702, featured: true },
  { id: "dimethyl-ether", formula: "CH₃OCH₃", atoms: { C: 2, H: 6, O: 1 }, group: "organic", angle: { degrees: 112, approx: true }, pubchemCid: 8254 },
  { id: "glycerol", formula: "C₃H₅(OH)₃", atoms: { C: 3, H: 8, O: 3 }, group: "organic", angle: { degrees: 109.5, approx: true }, pubchemCid: 753 },
  { id: "formaldehyde", formula: "HCHO", atoms: { H: 2, C: 1, O: 1 }, group: "organic", angle: { degrees: 120, approx: true }, pubchemCid: 712 },
  { id: "acetic-acid", formula: "CH₃COOH", atoms: { C: 2, H: 4, O: 2 }, group: "organic", angle: { degrees: 120, approx: true }, pubchemCid: 176 },
  { id: "acetone", formula: "CH₃COCH₃", atoms: { C: 3, H: 6, O: 1 }, group: "organic", angle: { degrees: 116, approx: true }, pubchemCid: 180 },
  { id: "propanal", formula: "C₂H₅CHO", atoms: { C: 3, H: 6, O: 1 }, group: "organic", angle: { degrees: 120, approx: true }, pubchemCid: 527 },
  { id: "phenol", formula: "C₆H₅OH", atoms: { C: 6, H: 6, O: 1 }, group: "organic", angle: { degrees: 120 }, pubchemCid: 996 },
  // Тірі ағза мен күнделікті өмірдегі заттар
  { id: "glucose", formula: "C₆H₁₂O₆", atoms: { C: 6, H: 12, O: 6 }, group: "bio", angle: { degrees: 109.5, approx: true }, pubchemCid: 5793 },
  { id: "sucrose", formula: "C₁₂H₂₂O₁₁", atoms: { C: 12, H: 22, O: 11 }, group: "bio", angle: { degrees: 109.5, approx: true }, pubchemCid: 5988 },
  { id: "urea", formula: "CO(NH₂)₂", atoms: { C: 1, O: 1, N: 2, H: 4 }, group: "bio", angle: { degrees: 120, approx: true }, pubchemCid: 1176 },
  { id: "glycine", formula: "NH₂CH₂COOH", atoms: { N: 1, H: 5, C: 2, O: 2 }, group: "bio", angle: { degrees: 109.5, approx: true }, pubchemCid: 750 },
  { id: "alanine", formula: "C₃H₇NO₂", atoms: { C: 3, H: 7, N: 1, O: 2 }, group: "bio", angle: { degrees: 109.5, approx: true }, pubchemCid: 5950 },
  { id: "aspirin", formula: "C₉H₈O₄", atoms: { C: 9, H: 8, O: 4 }, group: "bio", angle: { degrees: 120, approx: true }, pubchemCid: 2244 },
  { id: "vitamin-c", formula: "C₆H₈O₆", atoms: { C: 6, H: 8, O: 6 }, group: "bio", angle: { degrees: 109.5, approx: true }, pubchemCid: 54670067 },
  { id: "caffeine", formula: "C₈H₁₀N₄O₂", atoms: { C: 8, H: 10, N: 4, O: 2 }, group: "bio", angle: { degrees: 120, approx: true }, pubchemCid: 2519 },
  // Кристалдар (тор үзінділері)
  { id: "nacl", formula: "NaCl", atoms: { Na: 1, Cl: 1 }, group: "crystal", angle: { degrees: 90 }, pubchemCid: null, generated: { bond: "Na–Cl", length: 2.82 } },
  { id: "diamond", formula: "C", atoms: { C: 1 }, group: "crystal", angle: { degrees: 109.5 }, pubchemCid: null, generated: { bond: "C–C", length: 1.54 } },
  { id: "graphite", formula: "C", atoms: { C: 1 }, group: "crystal", angle: { degrees: 120 }, pubchemCid: null, generated: { bond: "C–C", length: 1.42 } },
  { id: "ice", formula: "H₂O", atoms: { H: 2, O: 1 }, group: "crystal", angle: { degrees: 109.5, approx: true }, pubchemCid: null, generated: { bond: "O···O", length: 2.75 }, hydrogenBonds: true },
  { id: "iron", formula: "Fe", atoms: { Fe: 1 }, group: "crystal", pubchemCid: null, generated: { bond: "Fe–Fe", length: 2.48 } },
  { id: "copper", formula: "Cu", atoms: { Cu: 1 }, group: "crystal", pubchemCid: null, generated: { bond: "Cu–Cu", length: 2.56 } },
];

/** Платформадағы молекулалар мен кристалдар (BLUEPRINT 10.1, кеңейтілген) */
export const MOLECULES: Molecule[] = ROWS.map(sdf);

export const FEATURED_MOLECULES = MOLECULES.filter((m) => m.featured);

export function getMolecule(id: string) {
  return MOLECULES.find((m) => m.id === id);
}

/** Молярлық масса = Σ (атом саны × атомдық масса) */
export function molarMass(atoms: Molecule["atoms"]): number {
  return Object.entries(atoms).reduce((sum, [symbol, count]) => sum + (getElement(symbol)?.mass ?? 0) * count, 0);
}

/** Байланыс бұрышы мәтін ретінде: "104,5°", "≈109,5°"; металл торында — null */
export function formatMoleculeAngle(molecule: Molecule, locale: Locale) {
  return molecule.angle ? `${molecule.angle.approx ? "≈" : ""}${formatShort(molecule.angle.degrees, locale)}°` : null;
}

/** Молекулалық формула (Хилл реті: C, H, сосын әліпби бойынша): этанол мен диметил эфирі → "C₂H₆O" */
export function molecularFormula(atoms: Molecule["atoms"]) {
  const order = (el: string) => (el === "C" ? "0" : el === "H" && "C" in atoms ? "1" : `2${el}`);
  const sub = (n: number) => (n === 1 ? "" : [...String(n)].map((d) => String.fromCharCode(0x2080 + Number(d))).join(""));
  return Object.keys(atoms)
    .sort((x, y) => order(x).localeCompare(order(y)))
    .map((el) => el + sub(atoms[el]))
    .join("");
}

/** Осы элемент кіретін молекулалар (периодтық кестеден сілтеме үшін) */
export function moleculesWith(symbol: string) {
  return MOLECULES.filter((m) => symbol in m.atoms);
}
