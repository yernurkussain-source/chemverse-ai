import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { PHENOMENA_SPEC } from "./model";

/** «Физикалық және химиялық құбылыстар» бағалауы. ТЕК СЕРВЕРДЕ */
const KIND_OF = ["physical", "physical", "chemical", "chemical", "physical", "chemical", "physical", "chemical"];
const CHEM = KIND_OF.filter((k) => k === "chemical").length;

export const PHENOMENA_KEY: MatrixKey = {
  equipment: ["goggles", "burner", "tongs", "beaker"],
  prediction: "chemical",
  cells: (row) => ({ kind: KIND_OF[row] }),
  questions: [
    { id: "mainSign", answer: "newSubstance", points: 7 },
    // Парафин балқиды (физикалық), фитиль маңында жанады (химиялық)
    { id: "candle", answer: "both", points: 6 },
    { id: "chemCount", value: CHEM, pct: 1, points: 7 },
  ],
  conclusion: {
    terms: [
      ["физикал", "физическ", "physical"],
      ["химиял", "химическ", "chemical"],
      ["жаңа зат", "новое веществ", "новые веществ", "new substance"],
    ],
    expectedNumbers: [CHEM],
  },
  reveal: { chemCount: CHEM },
};

export const gradePhenomena = (submission: MatrixSubmission) => gradeMatrix("phys-chem-phenomena", PHENOMENA_SPEC, PHENOMENA_KEY, submission);
