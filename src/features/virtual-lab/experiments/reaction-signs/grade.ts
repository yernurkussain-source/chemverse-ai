import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { outcome, REACTIONS, SIGNS_SPEC } from "./model";

/** «Химиялық реакция белгілері» бағалауы. ТЕК СЕРВЕРДЕ. Жауаптар қозғалтқыштан: басты белгі және ΔT (±0,3 °C) */
export const SIGNS_KEY: MatrixKey = {
  equipment: ["test-tubes", "rack", "dropper", "thermometer", "goggles"],
  prediction: "precipitate",
  cells: (row) => {
    const o = outcome(REACTIONS[row]);
    return { sign: o.sign, dT: { value: o.dT, abs: 0.3 } };
  },
  questions: [
    { id: "notSign", answer: "melting", points: 7 },
    { id: "gasTest", answer: "limewater", points: 6 },
    // 0,01 моль × 57 кДж/моль
    { id: "heat", value: 0.57, pct: 2, points: 7 },
  ],
  conclusion: {
    terms: [
      ["белгі", "признак", "sign"],
      ["газ", "gas"],
      ["тұнба", "осадок", "precipitat"],
    ],
    expectedNumbers: [outcome("neutralization").dT, outcome("magnesiumAcid").dT],
  },
};

export const gradeSigns = (submission: MatrixSubmission) => gradeMatrix("reaction-signs", SIGNS_SPEC, SIGNS_KEY, submission);
