import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, PENALTY_PER_MISTAKE, totalScore, withinAbs, withinPercent, type FeedbackItem } from "../../scoring";
import { comparisonPairs, countViolations, halfLife, isValidRun, MAX_RUNS, RATE, vMaxMl, volumeAt } from "./model";

/**
 * «Реакция жылдамдығы» бағалауы (docs/chemlab/CHEMLAB_SPEC.md 5.4 және 6-бөлім). ТЕК СЕРВЕРДЕ.
 */
export const RATE_KEY = {
  equipment: ["conical-flask", "gas-syringe", "thermometer", "stopwatch", "cylinder"],
  prediction: "faster",
  tempFactor: RATE.gamma,
  halfLife: "halved",
  finalVolume: "mgLimiting",
} as const;

export const rateExperimentSchema = z.object({
  runs: z
    .array(z.object({ T: z.number(), c: z.number() }))
    .max(MAX_RUNS)
    .refine((runs) => runs.every(isValidRun)),
});

export type RateSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof rateExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

const round = (value: number, digits = 1) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Тәжірибе (20): температура жұбы 10 + концентрация жұбы 10; «екеуі де өзгерді» ережесін бұзу −3, бірақ ≥ 0 */
export function runPoints(runs: z.infer<typeof rateExperimentSchema>["runs"]) {
  const pairs = comparisonPairs(runs);
  const violations = countViolations(runs);
  const base = (pairs.temperature ? 10 : 0) + (pairs.concentration ? 10 : 0);
  return { points: Math.max(0, base - PENALTY_PER_MISTAKE * violations), violations, ...pairs };
}

export function gradeRate(submission: RateSubmission) {
  const feedback: FeedbackItem[] = [];
  const { runs } = submission.experiment;

  const equipment = equipmentScore(submission.equipment, RATE_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });

  const run = runPoints(runs);
  feedback.push({ criterion: "procedure", key: run.temperature ? "pairTemperatureOk" : "pairTemperatureMissing" });
  feedback.push({ criterion: "procedure", key: run.concentration ? "pairConcentrationOk" : "pairConcentrationMissing" });
  if (run.violations) feedback.push({ criterion: "procedure", key: "bothChanged", values: { count: run.violations } });

  // Бақылау (25): әр жүгіртілімде V(30 с) графиктен оқылды (±1 мл)
  let right = 0;
  runs.forEach((r, i) => {
    if (withinAbs(parseNumber(submission.observations[`r${i}.v30`]), volumeAt(r, RATE.readAtSec), 1)) right += 1;
  });
  const total = Math.max(runs.length, 1);
  feedback.push({ criterion: "observation", key: right === runs.length && runs.length ? "observationAll" : "observationSome", values: { right, total } });

  // Талдау (20): γ 8 + t½ 6 + соңғы көлем 6
  const factorOk = withinPercent(parseNumber(submission.answers.tempFactor), RATE_KEY.tempFactor, 5);
  const halfOk = submission.answers.halfLife === RATE_KEY.halfLife;
  const finalOk = submission.answers.finalVolume === RATE_KEY.finalVolume;
  feedback.push({ criterion: "calc", key: factorOk ? "tempFactorOk" : "tempFactorWrong" });
  feedback.push({ criterion: "calc", key: halfOk ? "halfLifeOk" : "halfLifeWrong" });
  feedback.push({ criterion: "calc", key: finalOk ? "finalVolumeOk" : "finalVolumeWrong" });

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["температур", "temperatur"],
      ["концентрац", "concentrat"],
      ["жылдам", "скорост", "rate", "fast"],
    ],
    expectedNumbers: [RATE.gamma, round(vMaxMl()), 49, 34.7, 17.3, 8.7, ...runs.map((r) => round(halfLife(r)))],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + run.points,
    observation: (25 * right) / total,
    calc: (factorOk ? 8 : 0) + (halfOk ? 6 : 0) + (finalOk ? 6 : 0),
    conclusion: conclusion.score,
  });

  return {
    breakdown,
    feedback,
    reveal: {
      vMaxMl: round(vMaxMl()),
      gamma: RATE.gamma,
      violations: run.violations,
      predictionCorrect: submission.prediction ? submission.prediction === RATE_KEY.prediction : null,
    },
  };
}
