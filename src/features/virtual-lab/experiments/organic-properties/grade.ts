import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { CLASSES, ORGANIC_SPEC } from "./model";

/** «Органикалық қосылыстардың қасиеттері» бағалауы. ТЕК СЕРВЕРДЕ (заттар реті кластармен бірдей) */
export const ORGANIC_KEY: MatrixKey = {
  equipment: ["test-tubes", "rack", "dropper", "waterBath", "goggles"],
  prediction: "hexene",
  cells: (row) => ({ class: CLASSES[row] }),
  questions: [
    { id: "mirror", answer: "aldehyde", points: 6 },
    { id: "glucose", answer: "both", points: 7 },
    // 6 г CH₃COOH = 0,1 моль → 0,1 моль CO₂ · 22,4 л/моль
    { id: "co2", value: 2.24, pct: 2, points: 7 },
  ],
  conclusion: {
    terms: [
      ["сапалық", "качествен", "qualitative"],
      ["функционал", "functional"],
      ["альдегид", "aldehyd"],
    ],
    expectedNumbers: [2.24, 6],
  },
};

export const gradeOrganic = (submission: MatrixSubmission) => gradeMatrix("organic-properties", ORGANIC_SPEC, ORGANIC_KEY, submission);
