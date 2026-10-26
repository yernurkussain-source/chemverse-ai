import type { MatrixResult, MatrixSpec } from "../../matrix/spec";

/**
 * «Таза заттар мен қоспалар» (7-сынып): 6 үлгі × 3 сынақ (лупа, қыздыру/буландыру, балқу не қайнау температурасы).
 * Таза заттың температурасы тұрақты, ерітінді (біртекті қоспа) буланғанда қалдық қалады, әртекті қоспаның бөлшектері көрінеді.
 */
export const SAMPLES = ["water", "seawater", "salt", "sandIron", "muddyWater", "copper"] as const;
export const TESTS = ["lens", "heat", "temperature"] as const;
export const CLASSES = ["pure", "homogeneous", "heterogeneous"] as const;

const R: Record<(typeof SAMPLES)[number], Record<(typeof TESTS)[number], MatrixResult>> = {
  water: {
    lens: { seen: "lensClear" },
    heat: { seen: "noResidue", visual: { kind: "swatch", color: "rgb(230,240,248)" } },
    temperature: { seen: "constant", values: { t: 100 } },
  },
  seawater: {
    lens: { seen: "lensClear" },
    heat: { seen: "saltResidue", visual: { kind: "swatch", color: "rgb(250,250,250)" } },
    temperature: { seen: "rising" },
  },
  salt: {
    lens: { seen: "lensCrystals" },
    heat: { seen: "melts", values: { t: 801 } },
    temperature: { seen: "constant", values: { t: 801 } },
  },
  sandIron: {
    lens: { seen: "lensTwoKinds" },
    heat: { seen: "noChange" },
    temperature: { seen: "noPoint" },
  },
  muddyWater: {
    lens: { seen: "lensParticles" },
    heat: { seen: "mudResidue", visual: { kind: "swatch", color: "rgb(150,120,80)" } },
    temperature: { seen: "constant", values: { t: 100 } },
  },
  copper: {
    lens: { seen: "lensMetal" },
    heat: { seen: "melts", values: { t: 1085 } },
    temperature: { seen: "constant", values: { t: 1085 } },
  },
};

export const PURE_SPEC: MatrixSpec = {
  rows: SAMPLES,
  tests: () => TESTS,
  mode: "explore",
  result: (row, test) => R[SAMPLES[row]][test as (typeof TESTS)[number]],
};
