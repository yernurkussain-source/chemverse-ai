import type { MatrixResult, MatrixSpec } from "../../matrix/spec";

/**
 * «Органикалық қосылыстардың қасиеттері» (10-сынып): 6 зат × 5 сапалық реакция.
 * Суда еруі, бром суы (қос байланыс, альдегид тобы), Cu(OH)₂ (көп атомды спирт, қышқыл),
 * күміс айна (альдегид тобы), сода (карбон қышқылы → CO₂). Нәтижелер — мектеп оқулығындағы сапалық реакциялар.
 */
export const SUBSTANCES = ["hexane", "hexene", "ethanol", "glycerol", "aceticAcid", "glucose"] as const;
export const TESTS = ["water", "bromine", "copperHydroxide", "silverMirror", "soda"] as const;
export const CLASSES = ["alkane", "alkene", "alcohol", "polyol", "acid", "carbohydrate"] as const;

type Row = Record<(typeof TESTS)[number], string>;
const NO = "noChange";
const R: Record<(typeof SUBSTANCES)[number], Row> = {
  hexane: { water: "layers", bromine: NO, copperHydroxide: NO, silverMirror: NO, soda: NO },
  hexene: { water: "layers", bromine: "decolorized", copperHydroxide: NO, silverMirror: NO, soda: NO },
  ethanol: { water: "mixes", bromine: NO, copperHydroxide: NO, silverMirror: NO, soda: NO },
  glycerol: { water: "mixes", bromine: NO, copperHydroxide: "deepBlue", silverMirror: NO, soda: NO },
  aceticAcid: { water: "mixes", bromine: NO, copperHydroxide: "dissolvesBlue", silverMirror: NO, soda: "fizz" },
  glucose: { water: "dissolves", bromine: "decolorized", copperHydroxide: "deepBlue", silverMirror: "mirror", soda: NO },
};

const VISUAL: Record<string, MatrixResult["visual"]> = {
  layers: { kind: "tube", liquid: "rgba(230,220,150,0.45)" },
  decolorized: { kind: "tube", liquid: "rgba(208,230,242,0.3)" },
  deepBlue: { kind: "tube", liquid: "rgba(40,60,200,0.85)" },
  dissolvesBlue: { kind: "tube", liquid: "rgba(80,150,230,0.55)" },
  mirror: { kind: "swatch", color: "rgb(200,202,210)" },
  fizz: { kind: "tube", gas: true },
};

export const ORGANIC_SPEC: MatrixSpec = {
  rows: SUBSTANCES,
  tests: () => TESTS,
  mode: "explore",
  result: (row, test): MatrixResult => {
    const seen = R[SUBSTANCES[row]][test as (typeof TESTS)[number]];
    return { seen, visual: VISUAL[seen] };
  },
};
