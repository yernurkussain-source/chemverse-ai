import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { density, PROPERTIES_SPEC, SUBSTANCES } from "./model";

/** «Заттардың қасиеттері» бағалауы. ТЕК СЕРВЕРДЕ */
export const PROPERTIES_KEY: MatrixKey = {
  equipment: ["beaker", "magnet", "tester", "scales", "cylinder"],
  prediction: "paraffin",
  cells: (row) => ({ density: { value: density(row), pct: 2 } }),
  questions: [
    { id: "separate", answer: "magnet", points: 7 },
    // Қант та, тұз да суда ериді
    { id: "sugarSalt", answer: "water", points: 6 },
    { id: "copperDensity", value: 8.9, pct: 2, points: 7 },
  ],
  conclusion: {
    terms: [
      ["тығызд", "плотност", "density"],
      ["ери", "раствор", "dissolv"],
      ["магнит", "magnet"],
    ],
    expectedNumbers: SUBSTANCES.map((_, row) => density(row)),
  },
};

export const gradeProperties = (submission: MatrixSubmission) => gradeMatrix("substance-properties", PROPERTIES_SPEC, PROPERTIES_KEY, submission);
