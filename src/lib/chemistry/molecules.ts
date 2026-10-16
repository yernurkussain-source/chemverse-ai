/** Атомдық массалар (г/моль) */
export const ATOMIC_MASS = {
  H: 1.008,
  C: 12.011,
  N: 14.007,
  O: 15.999,
} as const;

export type ElementSymbol = keyof typeof ATOMIC_MASS;

export type MoleculeId = "h2o" | "co2" | "ch4" | "nh3" | "ethanol" | "benzene";

export type Molecule = {
  id: MoleculeId;
  formula: string;
  atoms: Partial<Record<ElementSymbol, number>>;
  /** Байланыс бұрышы, градус (approx — «шамамен», ≈ белгісімен көрсетіледі) */
  angle: { degrees: number; approx?: boolean };
};

/** Басты беттегі молекулалар (3D деректер 3-күні қосылады) */
export const MOLECULES: Molecule[] = [
  { id: "h2o", formula: "H₂O", atoms: { H: 2, O: 1 }, angle: { degrees: 104.5 } },
  { id: "co2", formula: "CO₂", atoms: { C: 1, O: 2 }, angle: { degrees: 180 } },
  { id: "ch4", formula: "CH₄", atoms: { C: 1, H: 4 }, angle: { degrees: 109.5 } },
  { id: "nh3", formula: "NH₃", atoms: { N: 1, H: 3 }, angle: { degrees: 107 } },
  { id: "ethanol", formula: "C₂H₅OH", atoms: { C: 2, H: 6, O: 1 }, angle: { degrees: 109, approx: true } },
  { id: "benzene", formula: "C₆H₆", atoms: { C: 6, H: 6 }, angle: { degrees: 120 } },
];

/** Молярлық масса = Σ (атом саны × атомдық масса) */
export function molarMass(atoms: Molecule["atoms"]): number {
  return Object.entries(atoms).reduce(
    (sum, [symbol, count]) => sum + ATOMIC_MASS[symbol as ElementSymbol] * (count ?? 0),
    0,
  );
}
