import type { MatrixResult, MatrixSpec } from "../../matrix/spec";
import { runTube } from "../metal-activity/model";

/**
 * «Тотығу-тотықсыздану» (10-сынып): 4 реакция — нәтижесін «Белсенділік қатары» тәжірибесінің моделі
 * (ортақ химия қозғалтқышы) береді. Оқушы тотықсыздандырғыш пен тотықтырғышты анықтайды.
 */
export const REACTIONS = ["zincCopper", "ironCopper", "copperSilver", "magnesiumAcid"] as const;
/** metal-activity ұяшықтары: металл × 3 + ерітінді (HCl, CuSO₄, AgNO₃) */
const CELL: Record<(typeof REACTIONS)[number], number> = { zincCopper: 4, ironCopper: 7, copperSilver: 11, magnesiumAcid: 0 };

/** Бақылау кестесіндегі бөлшектер: атомдар мен иондар */
export const PARTICLES = ["Zn", "Fe", "Cu", "Mg", "Cu2", "Ag", "H"] as const;

const COAT = { Cu: "rgb(196,96,52)", Ag: "rgb(200,202,210)" } as const;

export const REDOX_SPEC: MatrixSpec = {
  rows: REACTIONS,
  tests: () => ["run"],
  mode: "explore",
  result: (row): MatrixResult => {
    const r = runTube(CELL[REACTIONS[row]]);
    return {
      seen: r.coat === "Cu" ? "copperCoat" : r.coat === "Ag" ? "silverCoat" : "hydrogen",
      visual: { kind: "tube", liquid: REACTIONS[row] === "copperSilver" ? "rgba(80,150,230,0.35)" : undefined, ppt: r.coat ? COAT[r.coat] : undefined, gas: r.h2Ml > 0.1 },
    };
  },
};
