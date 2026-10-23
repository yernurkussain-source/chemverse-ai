import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, PENALTY_PER_MISTAKE, totalScore, withinAbs, withinPercent, type FeedbackItem } from "../../scoring";
import { comparisonPairs, countViolations, gammaOf, halfLife, isValidRun, MAX_RUNS, PREDICT_RUN, RATE, vMaxMl, volumeAt } from "./model";

/**
 * «Реакция жылдамдығы» бағалауы (docs/chemlab/CHEMLAB_SPEC.md 5.4 және 6-бөлім). ТЕК СЕРВЕРДЕ.
 * 9-сынып: γ = 2 белгілі. 10-сынып («Реакция кинетикасы»): γ жасырын (params.g), талдау сұрақтары басқа.
 */
export const RATE_KEY = {
  equipment: ["conical-flask", "gas-syringe", "thermometer", "stopwatch", "cylinder"],
  prediction: "faster",
  tempFactor: RATE.gamma,
  halfLife: "halved",
  finalVolume: "mgLimiting",
  /** 10-сынып: модельде реакция HCl бойынша бірінші ретті (k ∝ c) */
  order: 1,
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

export function gradeRate(params: Record<string, number>, submission: RateSubmission) {
  const feedback: FeedbackItem[] = [];
  const { runs } = submission.experiment;
  const advanced = params.level === 10;
  const gamma = gammaOf(params);

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
    if (withinAbs(parseNumber(submission.observations[`r${i}.v30`]), volumeAt(r, RATE.readAtSec, gamma), 1)) right += 1;
  });
  const total = Math.max(runs.length, 1);
  feedback.push({ criterion: "observation", key: right === runs.length && runs.length ? "observationAll" : "observationSome", values: { right, total } });

  // Талдау (20). 9-сынып: γ 8 + t½ 6 + соңғы көлем 6.
  // 10-сынып: жасырын γ-ны табу 8 + реакция реті 6 + 60 °C-тағы t½ болжамы 6 (барлығы ±5%)
  let calc: number;
  if (advanced) {
    const gammaOk = withinPercent(parseNumber(submission.answers.gammaFound), gamma, 5);
    const orderOk = withinPercent(parseNumber(submission.answers.order), RATE_KEY.order, 5);
    const predictOk = withinPercent(parseNumber(submission.answers.predictHalfLife), halfLife(PREDICT_RUN, gamma), 5);
    feedback.push({ criterion: "calc", key: gammaOk ? "gammaFoundOk" : "gammaFoundWrong" });
    feedback.push({ criterion: "calc", key: orderOk ? "orderOk" : "orderWrong" });
    feedback.push({ criterion: "calc", key: predictOk ? "predictHalfLifeOk" : "predictHalfLifeWrong" });
    calc = (gammaOk ? 8 : 0) + (orderOk ? 6 : 0) + (predictOk ? 6 : 0);
  } else {
    const factorOk = withinPercent(parseNumber(submission.answers.tempFactor), RATE_KEY.tempFactor, 5);
    const halfOk = submission.answers.halfLife === RATE_KEY.halfLife;
    const finalOk = submission.answers.finalVolume === RATE_KEY.finalVolume;
    feedback.push({ criterion: "calc", key: factorOk ? "tempFactorOk" : "tempFactorWrong" });
    feedback.push({ criterion: "calc", key: halfOk ? "halfLifeOk" : "halfLifeWrong" });
    feedback.push({ criterion: "calc", key: finalOk ? "finalVolumeOk" : "finalVolumeWrong" });
    calc = (factorOk ? 8 : 0) + (halfOk ? 6 : 0) + (finalOk ? 6 : 0);
  }

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["температур", "temperatur"],
      ["концентрац", "concentrat"],
      ["жылдам", "скорост", "rate", "fast"],
    ],
    expectedNumbers: [gamma, round(vMaxMl()), 49, round(halfLife(PREDICT_RUN, gamma)), ...runs.map((r) => round(halfLife(r, gamma)))],
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
    calc,
    conclusion: conclusion.score,
  });

  return {
    breakdown,
    feedback,
    reveal: {
      level: advanced ? 10 : 9,
      vMaxMl: round(vMaxMl()),
      gamma,
      ...(advanced ? { predictHalfLife: round(halfLife(PREDICT_RUN, gamma)) } : {}),
      violations: run.violations,
      predictionCorrect: submission.prediction ? submission.prediction === RATE_KEY.prediction : null,
    },
  };
}
