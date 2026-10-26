import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, totalScore, withinPercent, type FeedbackItem } from "../../scoring";
import { foundOf, TARGETS } from "./model";

/** «Органикалық конструктор» бағалауы. ТЕК СЕРВЕРДЕ */
const CLASS_OF = ["alkane", "alkane", "alcohol", "ether", "aldehyde", "ketone"];

export const ORGANIC_BUILDER_KEY = {
  equipment: ["carbon", "hydrogen", "oxygen", "bonds"],
  prediction: "2",
  isomers: "sameFormula",
  sodium: "ethanol",
  /** M(C₄H₁₀) = 4 · 12 + 10 · 1 */
  molarMass: 58,
} as const;

// shortcut: құрастырылғанын клиенттің тізімі бойынша санаймыз (құрылым серверде қайта тексерілмейді), бағалау ашық болса — графты жіберу керек
export const organicBuilderExperimentSchema = z.object({ found: z.array(z.string().max(40)).max(20) });

export type OrganicBuilderSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof organicBuilderExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

export function gradeOrganicBuilder(submission: OrganicBuilderSubmission) {
  const feedback: FeedbackItem[] = [];
  const found = foundOf(submission.experiment.found);

  const equipment = equipmentScore(submission.equipment, ORGANIC_BUILDER_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  feedback.push({ criterion: "procedure", key: "moleculesBuilt", values: { count: found.length, total: TARGETS.length } });

  const right = TARGETS.filter((_, i) => submission.observations[`r${i}.class`] === CLASS_OF[i]).length;
  feedback.push({ criterion: "observation", key: right === TARGETS.length ? "observationAll" : "observationSome", values: { right, total: TARGETS.length } });

  const isomersOk = submission.answers.isomers === ORGANIC_BUILDER_KEY.isomers;
  const sodiumOk = submission.answers.sodium === ORGANIC_BUILDER_KEY.sodium;
  const massOk = withinPercent(parseNumber(submission.answers.molarMass), ORGANIC_BUILDER_KEY.molarMass, 1);
  feedback.push({ criterion: "calc", key: `q.organic-builder.isomers.${isomersOk ? "ok" : "wrong"}` });
  feedback.push({ criterion: "calc", key: `q.organic-builder.sodium.${sodiumOk ? "ok" : "wrong"}` });
  feedback.push({ criterion: "calc", key: `q.organic-builder.molarMass.${massOk ? "ok" : "wrong"}` });

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["изомер", "isomer"],
      ["құрылы", "строени", "структур", "structur"],
      ["формула", "formula"],
    ],
    expectedNumbers: [58, 3, 6],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + (20 * found.length) / TARGETS.length,
    observation: (25 * right) / TARGETS.length,
    calc: (isomersOk ? 6 : 0) + (sodiumOk ? 7 : 0) + (massOk ? 7 : 0),
    conclusion: conclusion.score,
  });
  const reveal: Record<string, number | boolean | null> = {
    built: found.length,
    predictionCorrect: submission.prediction ? submission.prediction === ORGANIC_BUILDER_KEY.prediction : null,
  };
  return { breakdown, feedback, reveal };
}
