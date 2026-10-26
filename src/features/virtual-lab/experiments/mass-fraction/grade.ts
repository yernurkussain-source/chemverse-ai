import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, totalScore, withinAbs, withinPercent, type FeedbackItem } from "../../scoring";
import { fraction, isPrep, lastGood, TASKS } from "./model";

/** «Массалық үлес» бағалауы. ТЕК СЕРВЕРДЕ */
export const MASS_FRACTION_KEY = {
  equipment: ["scales", "cylinder", "beaker", "stirrer", "spatula", "goggles"],
  prediction: "right",
  /** 80 г 15 % ерітінді: 12 г тұз; + 20 г су → 12 / 100 */
  dilute: 12,
  evaporate: "increases",
  /** 25 г / 250 г */
  fraction: 10,
} as const;

export const massFractionExperimentSchema = z.object({ preps: z.array(z.unknown()).max(200) });

export type MassFractionSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof massFractionExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

export function gradeMassFraction(submission: MassFractionSubmission) {
  const feedback: FeedbackItem[] = [];
  const good = lastGood(submission.experiment.preps.filter(isPrep));

  // 1) Тәжірибе (30): құралдар 10 + дұрыс дайындалған ерітінділер 20
  const equipment = equipmentScore(submission.equipment, MASS_FRACTION_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  const made = good.filter(Boolean).length;
  feedback.push({ criterion: "procedure", key: "solutionsMade", values: { count: made, total: TASKS.length } });

  // 2) Бақылау (25): әр ерітіндінің массасы (±0,5 г) және оқушы өзі есептеген w (±0,2 %) — оның өз өлшемдері бойынша
  let right = 0;
  good.forEach((p, i) => {
    if (!p) return;
    if (withinAbs(parseNumber(submission.observations[`r${i}.mass`]), p[1] + p[2], 0.5)) right += 1;
    if (withinAbs(parseNumber(submission.observations[`r${i}.w`]), fraction(p[1], p[2]), 0.2)) right += 1;
  });
  const cells = TASKS.length * 2;
  feedback.push({ criterion: "observation", key: right === cells ? "observationAll" : "observationSome", values: { right, total: cells } });

  // 3) Талдау (20)
  const diluteOk = withinPercent(parseNumber(submission.answers.dilute), MASS_FRACTION_KEY.dilute, 2);
  const evaporateOk = submission.answers.evaporate === MASS_FRACTION_KEY.evaporate;
  const fractionOk = withinPercent(parseNumber(submission.answers.fraction), MASS_FRACTION_KEY.fraction, 2);
  feedback.push({ criterion: "calc", key: `q.mass-fraction.dilute.${diluteOk ? "ok" : "wrong"}` });
  feedback.push({ criterion: "calc", key: `q.mass-fraction.evaporate.${evaporateOk ? "ok" : "wrong"}` });
  feedback.push({ criterion: "calc", key: `q.mass-fraction.fraction.${fractionOk ? "ok" : "wrong"}` });

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["массалық үлес", "массов", "mass fraction"],
      ["ерітінді", "раствор", "solution"],
      ["еріген", "ерітілген", "растворённ", "растворен", "solute", "тұз", "соль", "salt"],
    ],
    expectedNumbers: TASKS.map((x) => x.w),
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + (20 * made) / TASKS.length,
    observation: (25 * right) / cells,
    calc: (diluteOk ? 7 : 0) + (evaporateOk ? 6 : 0) + (fractionOk ? 7 : 0),
    conclusion: conclusion.score,
  });
  const reveal: Record<string, number | boolean | null> = {
    ...Object.fromEntries(TASKS.map((x) => [`salt_${x.id}`, (x.mass * x.w) / 100])),
    predictionCorrect: submission.prediction ? submission.prediction === MASS_FRACTION_KEY.prediction : null,
  };
  return { breakdown, feedback, reveal };
}
