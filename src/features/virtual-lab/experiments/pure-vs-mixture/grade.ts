import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { PURE_SPEC } from "./model";

/** «Таза заттар мен қоспалар» бағалауы. ТЕК СЕРВЕРДЕ */
const CLASS_OF = ["pure", "homogeneous", "pure", "heterogeneous", "heterogeneous", "pure"];

export const PURE_KEY: MatrixKey = {
  equipment: ["magnifier", "dish", "burner", "thermometer", "goggles"],
  prediction: "homogeneous",
  cells: (row) => ({ class: CLASS_OF[row] }),
  questions: [
    { id: "air", answer: "homogeneous", points: 7 },
    { id: "sign", answer: "constant", points: 6 },
    // 3,5 г тұз / 100 г теңіз суы
    { id: "saltPct", value: 3.5, pct: 2, points: 7 },
  ],
  conclusion: {
    terms: [
      ["таза", "чист", "pure"],
      ["қоспа", "смес", "mixture"],
      ["біртекті", "однород", "homogen"],
    ],
    expectedNumbers: [3, 3.5],
  },
  reveal: { pureCount: CLASS_OF.filter((c) => c === "pure").length },
};

export const gradePure = (submission: MatrixSubmission) => gradeMatrix("pure-vs-mixture", PURE_SPEC, PURE_KEY, submission);
