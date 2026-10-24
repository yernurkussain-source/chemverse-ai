import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, totalScore, type FeedbackItem } from "../../scoring";
import { INDICATORS, testedTubes, TUBES, tubeSolutions } from "./model";

/**
 * «Индикатор зертханасы» бағалауы (docs/chemlab/CHEMLAB_SPEC.md 5.3 және 6-бөлім). ТЕК СЕРВЕРДЕ.
 */
export const INDICATOR_KEY = {
  equipment: ["test-tubes", "dropper", "indicators", "goggles"],
  prediction: "base",
  phenol: "colorless",
  higherPh: "naoh",
  whichIndicator: "universal",
} as const;

export const indicatorExperimentSchema = z.object({
  trials: z
    .array(z.object({ tube: z.number().int().min(0).max(TUBES.length - 1), indicator: z.enum(INDICATORS) }))
    .max(60),
});

export type IndicatorSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof indicatorExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

export function gradeIndicator(params: Record<string, number>, submission: IndicatorSubmission) {
  const feedback: FeedbackItem[] = [];
  const solutions = tubeSolutions(params);

  // 1) Тәжірибе (30): құралдар 10 + 6 пробирканың бәрі сыналды 20
  const equipment = equipmentScore(submission.equipment, INDICATOR_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  const tested = testedTubes(submission.experiment.trials);
  feedback.push({ criterion: "procedure", key: "tubesTested", values: { count: tested, total: TUBES.length } });

  // 2) Бақылау (25): әр пробирканың ортасы
  let right = 0;
  solutions.forEach((solution, i) => {
    if (submission.observations[`r${i}.medium`] === solution.medium) right += 1;
  });
  feedback.push({
    criterion: "observation",
    key: right === TUBES.length ? "observationAll" : "observationSome",
    values: { right, total: TUBES.length },
  });

  // 3) Талдау (20): фенолфталеин 6 + жоғары pH 7 + қай индикатор 7
  const phenolOk = submission.answers.phenol === INDICATOR_KEY.phenol;
  const higherOk = submission.answers.higherPh === INDICATOR_KEY.higherPh;
  const whichOk = submission.answers.whichIndicator === INDICATOR_KEY.whichIndicator;
  feedback.push({ criterion: "calc", key: phenolOk ? "phenolOk" : "phenolWrong" });
  feedback.push({ criterion: "calc", key: higherOk ? "higherPhOk" : "higherPhWrong" });
  feedback.push({ criterion: "calc", key: whichOk ? "whichIndicatorOk" : "whichIndicatorWrong" });

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["қышқыл", "кислот", "acid"],
      ["сілті", "негіз", "щелоч", "основ", "alkal", "base"],
      ["индикатор", "лакмус", "фенолфталеин", "indicator", "litmus"],
    ],
    // Ас содасы: қозғалтқыш бойынша 8,34 (оқушы 8,3 не 8,4 деп жазуы мүмкін)
    expectedNumbers: [7, 2, 12, 8.34, 8.3, 8.4, 8.2, 2.4],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + (20 * tested) / TUBES.length,
    observation: (25 * right) / TUBES.length,
    calc: (phenolOk ? 6 : 0) + (higherOk ? 7 : 0) + (whichOk ? 7 : 0),
    conclusion: conclusion.score,
  });

  // Ашылатын мәндер: әр пробиркадағы ерітінді (SOLUTIONS индексі)
  const reveal: Record<string, number | boolean | null> = Object.fromEntries(TUBES.map((_, i) => [`tube${i}`, params[`t${i}`] ?? i]));
  reveal.predictionCorrect = submission.prediction ? submission.prediction === INDICATOR_KEY.prediction : null;
  return { breakdown, feedback, reveal };
}
