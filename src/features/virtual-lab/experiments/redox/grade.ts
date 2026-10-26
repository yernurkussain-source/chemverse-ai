import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { REDOX_SPEC } from "./model";

/** «Тотығу-тотықсыздану» бағалауы. ТЕК СЕРВЕРДЕ */
const ROLES = [
  { reducer: "Zn", oxidizer: "Cu2" },
  { reducer: "Fe", oxidizer: "Cu2" },
  { reducer: "Cu", oxidizer: "Ag" },
  { reducer: "Mg", oxidizer: "H" },
];

export const REDOX_KEY: MatrixKey = {
  equipment: ["test-tubes", "rack", "sandpaper", "tweezers", "goggles"],
  prediction: "gives",
  cells: (row) => ROLES[row],
  questions: [
    { id: "reducer", answer: "gives", points: 6 },
    // KMnO₄: +1 + x + 4 · (−2) = 0
    { id: "manganese", value: 7, pct: 1, points: 7 },
    // Al⁰ → Al³⁺
    { id: "aluminium", value: 3, pct: 1, points: 7 },
  ],
  conclusion: {
    terms: [
      ["тотықтырғыш", "окислител", "oxidi"],
      ["электрон", "electron"],
      ["тотықсыздандырғыш", "восстановител", "reduc"],
    ],
    expectedNumbers: [2, 7, 3],
  },
};

export const gradeRedox = (submission: MatrixSubmission) => gradeMatrix("redox", REDOX_SPEC, REDOX_KEY, submission);
