import { gradeMatrix, type MatrixKey, type MatrixSubmission } from "../../matrix/grade";
import { ACTIONS, EQUILIBRIUM_SPEC, shiftOf } from "./model";

/** «Химиялық тепе-теңдік» бағалауы. ТЕК СЕРВЕРДЕ. Ығысу бағыты модельден (өнімнің мөлшері) */
export const EQUILIBRIUM_KEY: MatrixKey = {
  equipment: ["ampoules", "syringe", "hotBath", "iceBath", "test-tubes", "dropper", "goggles"],
  prediction: "darker",
  cells: (row) => ({ shift: shiftOf(ACTIONS[row]) }),
  questions: [
    { id: "catalyst", answer: "noShift", points: 6 },
    // Экзотермиялық реакцияны қыздырса — кері жаққа
    { id: "exothermic", answer: "reverse", points: 7 },
    // Kc = [NO₂]² / [N₂O₄] = 0,02² / 0,004
    { id: "kc", value: 0.1, pct: 2, points: 7 },
  ],
  conclusion: {
    terms: [
      ["тепе-тең", "равновес", "equilibri"],
      ["ығыс", "смещ", "shift"],
      ["шателье", "chatelier"],
    ],
    expectedNumbers: [0.1],
  },
};

export const gradeEquilibrium = (submission: MatrixSubmission) => gradeMatrix("equilibrium", EQUILIBRIUM_SPEC, EQUILIBRIUM_KEY, submission);
