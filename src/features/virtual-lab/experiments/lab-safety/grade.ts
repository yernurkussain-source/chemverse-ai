import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { MEANINGS, PICTOGRAMS, SAFETY_SPEC } from "./model";

/** «Қауіпсіздік ережелері» бағалауы. ТЕК СЕРВЕРДЕ (пиктограмма i — мағына i) */
export const SAFETY_KEY: MatrixKey = {
  equipment: ["goggles", "gloves", "coat", "firstAid"],
  prediction: "acidIntoWater",
  observationRows: PICTOGRAMS.length,
  cells: (row) => ({ meaning: MEANINGS[row] }),
  questions: [
    { id: "alkaliSkin", answer: "waterAcid", points: 7 },
    { id: "fire", answer: "sand", points: 6 },
    // қышқыл : су = 1 : 4 → 10 мл қышқылға 40 мл су
    { id: "dilution", value: 40, pct: 1, points: 7 },
  ],
  conclusion: {
    terms: [
      ["қауіпсіз", "безопас", "safe"],
      ["қышқыл", "кислот", "acid"],
      ["көзілдір", "очк", "goggles"],
    ],
    expectedNumbers: [8, 40],
  },
};

export const gradeSafety = (submission: MatrixSubmission) => gradeMatrix("lab-safety", SAFETY_SPEC, SAFETY_KEY, submission);
