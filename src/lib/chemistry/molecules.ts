import { getElement } from "./elements";

export type MoleculeId =
  | "h2o"
  | "co2"
  | "ch4"
  | "nh3"
  | "ethanol"
  | "benzene"
  | "nacl"
  | "h2so4"
  | "glucose"
  | "caffeine";

export type Molecule = {
  id: MoleculeId;
  formula: string;
  /** Құрамы (формулалық бірлік): элемент белгісі → атом саны */
  atoms: Record<string, number>;
  /** Байланыс бұрышы, градус (approx — «шамамен», ≈ белгісімен көрсетіледі) */
  angle: { degrees: number; approx?: boolean };
  /** 3D құрылым файлы (public/molecules/sdf) */
  sdf: string;
  /** PubChem нөмірі (дереккөз); NaCl торы бағдарламамен есептелген */
  pubchemCid: number | null;
  /** Басты беттегі 3D көріністе көрсетілетін молекулалар */
  featured?: boolean;
};

/** Платформадағы 10 молекула (BLUEPRINT 10.1) */
export const MOLECULES: Molecule[] = [
  { id: "h2o", formula: "H₂O", atoms: { H: 2, O: 1 }, angle: { degrees: 104.5 }, sdf: "/molecules/sdf/h2o.sdf", pubchemCid: 962, featured: true },
  { id: "co2", formula: "CO₂", atoms: { C: 1, O: 2 }, angle: { degrees: 180 }, sdf: "/molecules/sdf/co2.sdf", pubchemCid: 280, featured: true },
  { id: "ch4", formula: "CH₄", atoms: { C: 1, H: 4 }, angle: { degrees: 109.5 }, sdf: "/molecules/sdf/ch4.sdf", pubchemCid: 297, featured: true },
  { id: "nh3", formula: "NH₃", atoms: { N: 1, H: 3 }, angle: { degrees: 107 }, sdf: "/molecules/sdf/nh3.sdf", pubchemCid: 222, featured: true },
  { id: "ethanol", formula: "C₂H₅OH", atoms: { C: 2, H: 6, O: 1 }, angle: { degrees: 109, approx: true }, sdf: "/molecules/sdf/ethanol.sdf", pubchemCid: 702, featured: true },
  { id: "benzene", formula: "C₆H₆", atoms: { C: 6, H: 6 }, angle: { degrees: 120 }, sdf: "/molecules/sdf/benzene.sdf", pubchemCid: 241, featured: true },
  { id: "nacl", formula: "NaCl", atoms: { Na: 1, Cl: 1 }, angle: { degrees: 90 }, sdf: "/molecules/sdf/nacl.sdf", pubchemCid: null },
  { id: "h2so4", formula: "H₂SO₄", atoms: { H: 2, S: 1, O: 4 }, angle: { degrees: 109.5, approx: true }, sdf: "/molecules/sdf/h2so4.sdf", pubchemCid: 1118 },
  { id: "glucose", formula: "C₆H₁₂O₆", atoms: { C: 6, H: 12, O: 6 }, angle: { degrees: 109.5, approx: true }, sdf: "/molecules/sdf/glucose.sdf", pubchemCid: 5793 },
  { id: "caffeine", formula: "C₈H₁₀N₄O₂", atoms: { C: 8, H: 10, N: 4, O: 2 }, angle: { degrees: 120, approx: true }, sdf: "/molecules/sdf/caffeine.sdf", pubchemCid: 2519 },
];

export const FEATURED_MOLECULES = MOLECULES.filter((m) => m.featured);

export function getMolecule(id: string) {
  return MOLECULES.find((m) => m.id === id);
}

/** Молярлық масса = Σ (атом саны × атомдық масса) */
export function molarMass(atoms: Molecule["atoms"]): number {
  return Object.entries(atoms).reduce((sum, [symbol, count]) => sum + (getElement(symbol)?.mass ?? 0) * count, 0);
}
