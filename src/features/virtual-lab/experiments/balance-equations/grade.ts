import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, totalScore, withinPercent, type FeedbackItem } from "../../scoring";
import { atomCounts, COEFF_MAX, COEFF_MIN, EQUATIONS, isBalanced, totalAtoms } from "./model";

/**
 * «Коэффициенттерді таңдау» бағалауы (docs/chemlab/CHEMLAB_SPEC.md 6-бөлім). ТЕК СЕРВЕРДЕ.
 */
export const BALANCE_KEY = {
  equipment: ["coefficients", "atom-count", "conservation"],
  prediction: "4",
  /** Теңестірілген коэффициенттер (EQUATIONS ретімен) */
  solutions: [
    [2, 1, 2],
    [2, 1, 2],
    [1, 2, 1, 1],
    [4, 3, 2],
    [1, 2, 1, 2],
  ],
  indices: "substance",
  law: "conservation",
  /** 4 г H₂ = 2 моль → 2 моль H₂O = 36 г */
  waterMass: 36,
} as const;

export const balanceExperimentSchema = z.object({
  coeffs: z.array(z.array(z.number().int().min(COEFF_MIN).max(COEFF_MAX)).max(6)).max(EQUATIONS.length),
});

export type BalanceSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof balanceExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

export function gradeBalance(submission: BalanceSubmission) {
  const feedback: FeedbackItem[] = [];

  // 1) Тәжірибе (30): «құралдар» 10 + теңестірілген теңдеулер 20
  const equipment = equipmentScore(submission.equipment, BALANCE_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  const balanced = EQUATIONS.filter((_, i) => isBalanced(i, submission.experiment.coeffs[i] ?? [])).length;
  feedback.push({ criterion: "procedure", key: "equationsBalanced", values: { count: balanced, total: EQUATIONS.length } });

  // 2) Бақылау (25): бір жақтағы атомдардың жалпы саны (дұрыс коэффициенттермен)
  const right = EQUATIONS.filter(
    (_, i) => parseNumber(submission.observations[`r${i}.atoms`]) === totalAtoms(atomCounts(i, BALANCE_KEY.solutions[i]).left),
  ).length;
  feedback.push({
    criterion: "observation",
    key: right === EQUATIONS.length ? "observationAll" : "observationSome",
    values: { right, total: EQUATIONS.length },
  });

  // 3) Талдау (20): индекс 6 + заң 7 + су массасы 7 (±2%)
  const indicesOk = submission.answers.indices === BALANCE_KEY.indices;
  const lawOk = submission.answers.law === BALANCE_KEY.law;
  const massOk = withinPercent(parseNumber(submission.answers.waterMass), BALANCE_KEY.waterMass, 2);
  feedback.push({ criterion: "calc", key: indicesOk ? "indicesOk" : "indicesWrong" });
  feedback.push({ criterion: "calc", key: lawOk ? "lawOk" : "lawWrong" });
  feedback.push({ criterion: "calc", key: massOk ? "waterMassOk" : "waterMassWrong" });

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["коэффициент", "coefficient"],
      ["атом", "atom"],
      ["сақтал", "сохран", "conserv"],
    ],
    expectedNumbers: [BALANCE_KEY.waterMass],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + (20 * balanced) / EQUATIONS.length,
    observation: (25 * right) / EQUATIONS.length,
    calc: (indicesOk ? 6 : 0) + (lawOk ? 7 : 0) + (massOk ? 7 : 0),
    conclusion: conclusion.score,
  });

  const reveal: Record<string, number | boolean | null> = {
    balanced,
    waterMass: BALANCE_KEY.waterMass,
    predictionCorrect: submission.prediction ? submission.prediction === BALANCE_KEY.prediction : null,
  };
  return { breakdown, feedback, reveal };
}
