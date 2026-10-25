import { z } from "zod";
import { PPT } from "@/features/chem-engine";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, totalScore, withinPercent, type FeedbackItem } from "../../scoring";
import { CELLS, mix, testedCells } from "./model";

/**
 * «Тұнба түзілуі» бағалауы (docs/chemlab/CHEMLAB_SPEC.md 6-бөлім). ТЕК СЕРВЕРДЕ.
 */
export const PRECIPITATION_KEY = {
  equipment: ["test-tubes", "rack", "dropper", "goggles", "gloves"],
  prediction: "bluePpt",
  ionic: "baso4",
  silver: "chloride",
  /** 0,01 моль Ba²⁺ → BaSO₄: m = 0,01 · 233,39 г */
  pptMass: 0.01 * PPT.BaSO4.M,
} as const;

export const precipitationExperimentSchema = z.object({
  mixed: z.array(z.number().int().min(0).max(CELLS.length - 1)).max(60),
});

export type PrecipitationSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof precipitationExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

export function gradePrecipitation(submission: PrecipitationSubmission) {
  const feedback: FeedbackItem[] = [];
  const results = CELLS.map((_, i) => mix(i).ppt);

  // 1) Тәжірибе (30): құралдар 10 + 12 жұптың бәрі араластырылды 20
  const equipment = equipmentScore(submission.equipment, PRECIPITATION_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  const tested = testedCells(submission.experiment.mixed);
  feedback.push({ criterion: "procedure", key: "tubesTested", values: { count: tested, total: CELLS.length } });

  // 2) Бақылау (25): әр пробиркадағы тұнбаның формуласы (не «тұнба жоқ»)
  const right = results.filter((ppt, i) => submission.observations[`r${i}.ppt`] === (ppt ?? "none")).length;
  feedback.push({
    criterion: "observation",
    key: right === CELLS.length ? "observationAll" : "observationSome",
    values: { right, total: CELLS.length },
  });

  // 3) Талдау (20): иондық теңдеу 7 + AgCl 6 + тұнба массасы 7 (±2%)
  const ionicOk = submission.answers.ionic === PRECIPITATION_KEY.ionic;
  const silverOk = submission.answers.silver === PRECIPITATION_KEY.silver;
  const massOk = withinPercent(parseNumber(submission.answers.pptMass), PRECIPITATION_KEY.pptMass, 2);
  feedback.push({ criterion: "calc", key: ionicOk ? "ionicOk" : "ionicWrong" });
  feedback.push({ criterion: "calc", key: silverOk ? "silverOk" : "silverWrong" });
  feedback.push({ criterion: "calc", key: massOk ? "pptMassOk" : "pptMassWrong" });

  const pptCount = results.filter(Boolean).length;
  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["тұнба", "осадок", "precipitat"],
      ["ион", "ion"],
      ["ерімейтін", "ерімейді", "нераствор", "insoluble"],
    ],
    expectedNumbers: [pptCount],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + (20 * tested) / CELLS.length,
    observation: (25 * right) / CELLS.length,
    calc: (ionicOk ? 7 : 0) + (silverOk ? 6 : 0) + (massOk ? 7 : 0),
    conclusion: conclusion.score,
  });

  const reveal: Record<string, number | boolean | null> = {
    pptCount,
    pptMass: Math.round(PRECIPITATION_KEY.pptMass * 100) / 100,
    predictionCorrect: submission.prediction ? submission.prediction === PRECIPITATION_KEY.prediction : null,
  };
  return { breakdown, feedback, reveal };
}
