import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, PENALTY_PER_MISTAKE, totalScore, withinPercent, type FeedbackItem } from "../../scoring";
import { isSeparated, MIXTURE_ACTIONS, observationRows, runActions, saltFractionPct, saltYieldPct } from "./model";

/**
 * «Қоспаны бөлу» бағалауы (docs/chemlab/CHEMLAB_SPEC.md 5.1 және 6-бөлім). ТЕК СЕРВЕРДЕ:
 * жауап кілті бар, файлды тек features/virtual-lab/actions.ts импорттайды.
 */
export const MIXTURE_KEY = {
  equipment: ["beaker", "glass-rod", "funnel", "porcelain-dish", "hotplate"],
  prediction: "dissolve",
  whySand: "insoluble",
} as const;

export const mixtureExperimentSchema = z.object({
  actions: z.array(z.enum(MIXTURE_ACTIONS)).max(60),
});

export type MixtureSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof mixtureExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Тәжірибе әрекеттері (20): аяқталса 20, әйтпесе әр дұрыс кезең 5; әр қате әрекет −3, бірақ ≥ 0 */
export function actionPoints(actions: z.infer<typeof mixtureExperimentSchema>["actions"]) {
  const { state, mistakes } = runActions(actions);
  const stages = [state.dissolved, state.filtered, state.evaporated, state.dried].filter(Boolean).length;
  const base = isSeparated(state) ? 20 : stages * 5;
  return { points: Math.max(0, base - PENALTY_PER_MISTAKE * mistakes), mistakes, separated: isSeparated(state), stages };
}

export function gradeMixture(submission: MixtureSubmission) {
  const feedback: FeedbackItem[] = [];

  // 1) Тәжірибені орындау (30): құралдар 10 + әрекеттер реті 20
  const equipment = equipmentScore(submission.equipment, MIXTURE_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });

  const actions = actionPoints(submission.experiment.actions);
  feedback.push({ criterion: "procedure", key: actions.separated ? "mixtureSeparated" : "mixtureNotSeparated" });
  if (actions.mistakes) feedback.push({ criterion: "procedure", key: "wrongActions", values: { count: actions.mistakes } });

  // 2) Бақылау (25): әр заттың орны мен ерігіштігі
  const rows = observationRows();
  let right = 0;
  rows.forEach((row, i) => {
    if (submission.observations[`r${i}.place`] === row.place) right += 1;
    if (submission.observations[`r${i}.soluble`] === row.soluble) right += 1;
  });
  const cells = rows.length * 2;
  feedback.push({ criterion: "observation", key: right === cells ? "observationAll" : "observationSome", values: { right, total: cells } });

  // 3) Есептеу (20): массалық үлес 8 + шығым 8 + түсіндіру 4 (сандар ±1%)
  const fractionOk = withinPercent(parseNumber(submission.answers.fraction), saltFractionPct(), 1);
  const yieldOk = withinPercent(parseNumber(submission.answers.yield), saltYieldPct(), 1);
  const whyOk = submission.answers.whySand === MIXTURE_KEY.whySand;
  feedback.push({ criterion: "calc", key: fractionOk ? "fractionOk" : "fractionWrong" });
  feedback.push({ criterion: "calc", key: yieldOk ? "yieldOk" : "yieldWrong" });
  feedback.push({ criterion: "calc", key: whyOk ? "whySandOk" : "whySandWrong" });

  // 4) Қорытынды (25): алдын ала, ереже бойынша
  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["еріт", "ерімей", "раствор", "dissolv"],
      ["сүз", "фильтр", "filter"],
      ["булан", "выпар", "evapor"],
    ],
    expectedNumbers: [saltFractionPct(), saltYieldPct(), 96, 11.8, 7.7],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + actions.points,
    observation: (25 * right) / cells,
    calc: (fractionOk ? 8 : 0) + (yieldOk ? 8 : 0) + (whyOk ? 4 : 0),
    conclusion: conclusion.score,
  });

  return {
    breakdown,
    feedback,
    reveal: {
      saltFractionPct: round(saltFractionPct()),
      saltYieldPct: round(saltYieldPct()),
      sandYieldG: 11.8,
      saltYieldG: 7.7,
      mistakes: actions.mistakes,
      predictionCorrect: submission.prediction ? submission.prediction === MIXTURE_KEY.prediction : null,
    },
  };
}
