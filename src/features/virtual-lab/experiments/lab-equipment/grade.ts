import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { EQUIPMENT_SPEC, GLASSWARE } from "./model";

/** «Зертханалық құралдар» бағалауы. ТЕК СЕРВЕРДЕ */
// Өлшеуіш цилиндр мен воронканы қыздырмайды; стакан мен колбаны — асбест тор арқылы
const HEAT: Record<(typeof GLASSWARE)[number], string> = { cylinder: "no", beaker: "yes", testTube: "yes", flask: "yes", dish: "yes", funnel: "no" };

export const EQUIPMENT_KEY: MatrixKey = {
  equipment: ["coat", "goggles", "notebook"],
  prediction: "cylinder",
  observationRows: GLASSWARE.length,
  cells: (row) => ({ heat: HEAT[GLASSWARE[row]] }),
  questions: [
    // (20 − 10) / 5 бөлік
    { id: "division", value: 2, pct: 1, points: 7 },
    { id: "tubeMouth", answer: "away", points: 6 },
    { id: "cylinderHeat", answer: "crack", points: 7 },
  ],
  conclusion: {
    terms: [
      ["цилиндр", "мензурк", "cylinder"],
      ["қыздыр", "нагрев", "heat"],
      ["құрал", "ыдыс", "прибор", "посуд", "equipment", "glassware"],
    ],
    expectedNumbers: [2, 8],
  },
};

export const gradeEquipment = (submission: MatrixSubmission) => gradeMatrix("lab-equipment", EQUIPMENT_SPEC, EQUIPMENT_KEY, submission);
