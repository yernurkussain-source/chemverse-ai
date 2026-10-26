import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { METALS_SPEC } from "./model";

/** «Металдар мен бейметалдар» бағалауы. ТЕК СЕРВЕРДЕ (Mg, Cu, Fe — металл; S, C, P — бейметалл) */
const CLASS_OF = ["metal", "metal", "metal", "nonmetal", "nonmetal", "nonmetal"];

export const METALS_KEY: MatrixKey = {
  equipment: ["tester", "hammer", "spoon", "burner", "litmus", "goggles"],
  prediction: "yes",
  cells: (row) => ({ class: CLASS_OF[row] }),
  questions: [
    { id: "graphite", answer: "several", points: 7 },
    { id: "oxide", answer: "acid", points: 6 },
    // 2Mg + O₂ → 2MgO: 2,4 г / 24 г/моль = 0,1 моль → 0,1 · 40 г/моль
    { id: "mgo", value: 4, pct: 2, points: 7 },
  ],
  conclusion: {
    terms: [
      ["металл", "metal"],
      ["бейметал", "неметалл", "nonmetal", "non-metal"],
      ["оксид", "oxide"],
    ],
    expectedNumbers: [3, 4],
  },
};

export const gradeMetals = (submission: MatrixSubmission) => gradeMatrix("metals-nonmetals", METALS_SPEC, METALS_KEY, submission);
