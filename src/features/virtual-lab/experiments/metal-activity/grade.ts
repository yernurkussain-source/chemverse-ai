import { z } from "zod";
import { METAL } from "@/features/chem-engine";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, totalScore, withinPercent, type FeedbackItem } from "../../scoring";
import { CELLS, metalSummary, PIECE_G, testedCells, VM_ML } from "./model";

/**
 * «Металдардың белсенділігі» бағалауы (docs/chemlab/CHEMLAB_SPEC.md 6-бөлім). ТЕК СЕРВЕРДЕ.
 */
export const ACTIVITY_KEY = {
  equipment: ["test-tubes", "rack", "tweezers", "sandpaper", "scales", "goggles"],
  prediction: "silver",
  order: "mgZnFeCu",
  copper: "position",
  /** 0,1 г Mg толық әрекеттессе: V(H₂) = m / M · Vm */
  h2Volume: (PIECE_G / METAL.Mg.M) * VM_ML,
} as const;

export const activityExperimentSchema = z.object({
  tested: z.array(z.number().int().min(0).max(CELLS.length - 1)).max(60),
});

export type ActivitySubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof activityExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

export function gradeActivity(submission: ActivitySubmission) {
  const feedback: FeedbackItem[] = [];
  const summary = metalSummary();

  // 1) Тәжірибе (30): құралдар 10 + 12 пробирканың бәрі сыналды 20
  const equipment = equipmentScore(submission.equipment, ACTIVITY_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  const tested = testedCells(submission.experiment.tested);
  feedback.push({ criterion: "procedure", key: "tubesTested", values: { count: tested, total: CELLS.length } });

  // 2) Бақылау (25): әр металл үшін әрекеттескен ерітінді саны және белсенділік орны (8 ұяшық)
  let right = 0;
  summary.forEach((s, i) => {
    if (submission.observations[`r${i}.reactions`] === String(s.reactions)) right += 1;
    if (submission.observations[`r${i}.rank`] === String(s.rank)) right += 1;
  });
  const cells = summary.length * 2;
  feedback.push({ criterion: "observation", key: right === cells ? "observationAll" : "observationSome", values: { right, total: cells } });

  // 3) Талдау (20): белсенділік қатары 7 + мыс 6 + сутек көлемі 7 (±2%)
  const orderOk = submission.answers.order === ACTIVITY_KEY.order;
  const copperOk = submission.answers.copper === ACTIVITY_KEY.copper;
  const volumeOk = withinPercent(parseNumber(submission.answers.h2Volume), ACTIVITY_KEY.h2Volume, 2);
  feedback.push({ criterion: "calc", key: orderOk ? "activityOrderOk" : "activityOrderWrong" });
  feedback.push({ criterion: "calc", key: copperOk ? "copperOk" : "copperWrong" });
  feedback.push({ criterion: "calc", key: volumeOk ? "h2VolumeOk" : "h2VolumeWrong" });

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["белсенді", "активн", "activ", "reactiv"],
      ["сутек", "водород", "hydrogen", "h₂", "h2"],
      ["ығыстыр", "вытесн", "displac"],
    ],
    // Оқушы бақылаған газ көлемдері (кез келгені жеткілікті)
    expectedNumbers: summary.map((s) => s.h2Ml),
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + (20 * tested) / CELLS.length,
    observation: (25 * right) / cells,
    calc: (orderOk ? 7 : 0) + (copperOk ? 6 : 0) + (volumeOk ? 7 : 0),
    conclusion: conclusion.score,
  });

  const reveal: Record<string, number | boolean | null> = {
    ...Object.fromEntries(summary.filter((s) => s.h2Ml > 0).map((s) => [`h2${s.metal}`, s.h2Ml])),
    h2Volume: Math.round(ACTIVITY_KEY.h2Volume * 10) / 10,
    predictionCorrect: submission.prediction ? submission.prediction === ACTIVITY_KEY.prediction : null,
  };
  return { breakdown, feedback, reveal };
}
