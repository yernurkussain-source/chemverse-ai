import { randomInt } from "node:crypto";
import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, PENALTY_PER_MISTAKE, totalScore, withinAbs, withinPercent, type FeedbackItem } from "../../scoring";
import { ACTIONS, expectedValues, isMeasureDone, paramsOf, QUANTITIES, runActions } from "./model";

/** «Өлшеулер» бағалауы. ТЕК СЕРВЕРДЕ */
export const MEASURE_KEY = {
  equipment: ["scales", "cylinder", "beaker", "thread"],
  prediction: "displacement",
  meniscus: "bottom",
  tare: "container",
  /** 55 мл − 40 мл */
  bodyVolume: 15,
} as const;

/** Әр жолы басқа тас: көлемі 6–14 мл, тығыздығы 2,5–2,9 г/см³, стақан 48–58 г, су 18–30 мл */
export function measureParams(): Record<string, number> {
  const dv = randomInt(6, 15);
  const rho = randomInt(250, 291) / 100;
  return { b: randomInt(4800, 5801) / 100, m: Math.round(dv * rho * 100) / 100, v1: randomInt(18, 31), dv };
}

export const measureExperimentSchema = z.object({ actions: z.array(z.enum(ACTIONS)).max(40) });

export type MeasureSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof measureExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

/** Рұқсат: масса — таразының көрсеткіші (±0,01 г), көлем — бөлік құнының жартысы (±0,5 мл) */
const TOLERANCE = { mass: 0.01, v1: 0.5, v2: 0.5, volume: 1 } as const;

export function gradeMeasure(raw: Record<string, number>, submission: MeasureSubmission) {
  const params = paramsOf(raw);
  const feedback: FeedbackItem[] = [];
  const state = runActions(params, submission.experiment.actions);

  // 1) Тәжірибе (30): құралдар 10 + өлшеулер 20 (әр қате әрекет −3)
  const equipment = equipmentScore(submission.equipment, MEASURE_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  const steps = (state.stoneOnScale ? 10 : 0) + (state.stoneInCylinder ? 10 : 0);
  feedback.push({ criterion: "procedure", key: isMeasureDone(state) ? "measureDone" : "measureNotDone" });
  if (state.mistakes.length) feedback.push({ criterion: "procedure", key: "wrongActions", values: { count: state.mistakes.length } });

  // 2) Бақылау (25): 5 шама
  const expected = expectedValues(params);
  const right = QUANTITIES.filter((q, i) => {
    const v = parseNumber(submission.observations[`r${i}.value`]);
    return q === "density" ? withinPercent(v, expected.density, 3) : withinAbs(v, expected[q], TOLERANCE[q]);
  }).length;
  feedback.push({ criterion: "observation", key: right === QUANTITIES.length ? "observationAll" : "observationSome", values: { right, total: QUANTITIES.length } });

  // 3) Талдау (20): мениск 6 + тара 7 + дененің көлемі 7
  const meniscusOk = submission.answers.meniscus === MEASURE_KEY.meniscus;
  const tareOk = submission.answers.tare === MEASURE_KEY.tare;
  const volumeOk = withinPercent(parseNumber(submission.answers.bodyVolume), MEASURE_KEY.bodyVolume, 1);
  feedback.push({ criterion: "calc", key: `q.measurements.meniscus.${meniscusOk ? "ok" : "wrong"}` });
  feedback.push({ criterion: "calc", key: `q.measurements.tare.${tareOk ? "ok" : "wrong"}` });
  feedback.push({ criterion: "calc", key: `q.measurements.bodyVolume.${volumeOk ? "ok" : "wrong"}` });

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["масса", "mass"],
      ["көлем", "объём", "объем", "volume"],
      ["тығызд", "плотност", "density"],
    ],
    expectedNumbers: [expected.density, expected.mass],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + steps - PENALTY_PER_MISTAKE * state.mistakes.length,
    observation: (25 * right) / QUANTITIES.length,
    calc: (meniscusOk ? 6 : 0) + (tareOk ? 7 : 0) + (volumeOk ? 7 : 0),
    conclusion: conclusion.score,
  });
  const reveal: Record<string, number | boolean | null> = {
    mass: expected.mass,
    v1: expected.v1,
    v2: expected.v2,
    density: Math.round(expected.density * 100) / 100,
    predictionCorrect: submission.prediction ? submission.prediction === MEASURE_KEY.prediction : null,
  };
  return { breakdown, feedback, reveal };
}
