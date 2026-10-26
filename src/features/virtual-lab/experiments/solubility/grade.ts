import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, totalScore, withinAbs, withinPercent, type FeedbackItem } from "../../scoring";
import { isSample, REQUIRED, saturated, solubility, SOLUBILITY } from "./model";

/** «Ерігіштік» бағалауы. ТЕК СЕРВЕРДЕ */
export const SOLUBILITY_KEY = {
  equipment: ["beaker", "scales", "thermometer", "stirrer", "hotplate", "goggles"],
  prediction: "increases",
  trend: "sharply",
  recrystal: "KNO3",
  /** 60 °C-тағы 110 г − 20 °C-тағы 31,6 г */
  crystals: SOLUBILITY.KNO3[6] - SOLUBILITY.KNO3[2],
} as const;

export const solubilityExperimentSchema = z.object({ samples: z.array(z.unknown()).max(400) });

export type SolubilitySubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof solubilityExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

export function gradeSolubility(submission: SolubilitySubmission) {
  const feedback: FeedbackItem[] = [];
  const samples = submission.experiment.samples.filter(isSample);

  // 1) Тәжірибе (30): құралдар 10 + қаныққан ерітінді алынған нүктелер 20
  const equipment = equipmentScore(submission.equipment, SOLUBILITY_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  const points = REQUIRED.filter(([salt, t]) => samples.some((s) => s[0] === salt && s[1] === t && saturated(s))).length;
  feedback.push({ criterion: "procedure", key: "testsDone", values: { count: points, total: REQUIRED.length } });

  // 2) Бақылау (25): 6 нүктенің ерігіштігі (±1,5 г — тұзды 1 г-нан қосады)
  const right = REQUIRED.filter(([salt, t], i) => withinAbs(parseNumber(submission.observations[`r${i}.value`]), solubility(salt, t), 1.5)).length;
  feedback.push({ criterion: "observation", key: right === REQUIRED.length ? "observationAll" : "observationSome", values: { right, total: REQUIRED.length } });

  // 3) Талдау (20)
  const trendOk = submission.answers.trend === SOLUBILITY_KEY.trend;
  const recrystalOk = submission.answers.recrystal === SOLUBILITY_KEY.recrystal;
  const crystalsOk = withinPercent(parseNumber(submission.answers.crystals), SOLUBILITY_KEY.crystals, 2);
  feedback.push({ criterion: "calc", key: `q.solubility.trend.${trendOk ? "ok" : "wrong"}` });
  feedback.push({ criterion: "calc", key: `q.solubility.recrystal.${recrystalOk ? "ok" : "wrong"}` });
  feedback.push({ criterion: "calc", key: `q.solubility.crystals.${crystalsOk ? "ok" : "wrong"}` });

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["ерігіш", "растворим", "solubil"],
      ["температура", "temperature"],
      ["қаныққан", "насыщ", "saturat"],
    ],
    expectedNumbers: REQUIRED.map(([salt, t]) => solubility(salt, t)),
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + (20 * points) / REQUIRED.length,
    observation: (25 * right) / REQUIRED.length,
    calc: (trendOk ? 6 : 0) + (recrystalOk ? 7 : 0) + (crystalsOk ? 7 : 0),
    conclusion: conclusion.score,
  });
  const reveal: Record<string, number | boolean | null> = {
    ...Object.fromEntries(REQUIRED.map(([salt, t]) => [`${salt}_${t}`, solubility(salt, t)])),
    predictionCorrect: submission.prediction ? submission.prediction === SOLUBILITY_KEY.prediction : null,
  };
  return { breakdown, feedback, reveal };
}
