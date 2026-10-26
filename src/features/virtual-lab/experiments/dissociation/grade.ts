import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { DISSOCIATION_SPEC, SOLUTIONS, TYPE_OF } from "./model";

/** «Электролиттік диссоциация» бағалауы. ТЕК СЕРВЕРДЕ */
export const DISSOCIATION_KEY: MatrixKey = {
  equipment: ["tester", "beakers", "distilled", "goggles"],
  prediction: "no",
  cells: (row) => ({ type: TYPE_OF[SOLUTIONS[row]] }),
  questions: [
    { id: "weak", answer: "few", points: 6 },
    { id: "particles", answer: "ions", points: 7 },
    // [H⁺] = α · c = 0,013 · 0,1
    { id: "hydrogen", value: 0.0013, pct: 2, points: 7 },
  ],
  conclusion: {
    terms: [
      ["электролит", "electrolyt"],
      ["ион", "ion"],
      ["диссоциац", "dissociat"],
    ],
    expectedNumbers: [1.3, 0.0013, 3],
  },
};

export const gradeDissociation = (submission: MatrixSubmission) => gradeMatrix("dissociation", DISSOCIATION_SPEC, DISSOCIATION_KEY, submission);
