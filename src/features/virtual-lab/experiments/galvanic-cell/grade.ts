import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { cellOf, E0, GALVANIC_SPEC } from "./model";

/** «Гальваникалық элемент» бағалауы. ТЕК СЕРВЕРДЕ. ЭҚК ±0,02 В */
export const GALVANIC_KEY: MatrixKey = {
  equipment: ["beakers", "plates", "bridge", "voltmeter", "wires", "goggles"],
  prediction: "Zn",
  cells: (row) => {
    const c = cellOf(row);
    return { anode: c.anode, emf: { value: c.emf, abs: 0.02 } };
  },
  questions: [
    { id: "daniell", answer: "Zn", points: 6 },
    { id: "electrons", answer: "anodeToCathode", points: 7 },
    // Mg | Ag: 0,80 − (−2,37)
    { id: "emf", value: Math.round((E0.Ag - E0.Mg) * 100) / 100, pct: 1, points: 7 },
  ],
  conclusion: {
    terms: [
      ["анод", "anode"],
      ["катод", "cathode"],
      ["эқк", "эдс", "emf", "кернеу", "напряж", "voltage"],
    ],
    expectedNumbers: [1.1],
  },
};

export const gradeGalvanic = (submission: MatrixSubmission) => gradeMatrix("galvanic-cell", GALVANIC_SPEC, GALVANIC_KEY, submission);
