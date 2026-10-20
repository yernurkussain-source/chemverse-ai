import { z } from "zod";
import { equivalenceVolume, TITRATION } from "@/lib/chemistry/titration";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, totalScore, withinPercent, type FeedbackItem, type ScoreBreakdown } from "../../scoring";
import { concentrationFromEndpoint, observationRows } from "./model";

/**
 * Титрлеуді бағалау (docs/chemlab/CHEMLAB_SPEC.md 5.5 және 6-бөлім). ТЕК СЕРВЕРДЕ:
 * мұнда жауап кілті бар, файлды тек features/virtual-lab/actions.ts импорттайды.
 */
export const TITRATION_KEY = {
  equipment: ["burette", "conical-flask", "pipette", "phenolphthalein"],
  eqMedium: "neutral",
  prediction: "eq7",
} as const;

/** Тәжірибе қадамының жазбасы: тоқтаған көлем және неше рет құйылды */
export const titrationExperimentSchema = z.object({
  endpointMl: z.number().min(0).max(TITRATION.maxVolumeMl),
  additions: z.number().int().min(0).max(5000),
});

export type TitrationSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof titrationExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

export type TitrationReveal = {
  trueConcentration: number;
  equivalenceMl: number;
  endpointMl: number;
  overshootMl: number;
  /** Оқушының c(HCl) жауабының нақты мәннен қателігі, % (мұғалімнің сынып беті осыны көрсетеді) */
  answerErrorPct: number | null;
  predictionCorrect: boolean | null;
};

const round = (value: number, digits = 2) => Math.round(value * 10 ** digits) / 10 ** digits;

/** Эквивалент нүктесінен ауытқу бойынша ұпай (20-дан) */
export function endpointPoints(endpointMl: number, equivalenceMl: number) {
  if (!(endpointMl > 0)) return 0;
  const off = Math.abs(endpointMl - equivalenceMl);
  if (off <= 0.1 + 1e-9) return 20;
  if (off <= 0.5 + 1e-9) return 14;
  if (off <= 1 + 1e-9) return 8;
  return 3;
}

export function gradeTitration(concentration: number, submission: TitrationSubmission) {
  const feedback: FeedbackItem[] = [];
  const equivalenceMl = equivalenceVolume(concentration);
  const { endpointMl } = submission.experiment;
  const overshootMl = endpointMl - equivalenceMl;

  // 1) Тәжірибені орындау (30): құралдар 10 + эквивалент нүктесінде тоқтау 20
  const equipment = equipmentScore(submission.equipment, TITRATION_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });

  const endpoint = endpointPoints(endpointMl, equivalenceMl);
  if (Math.abs(overshootMl) <= 0.1) feedback.push({ criterion: "procedure", key: "endpointExact" });
  else if (overshootMl > 0) feedback.push({ criterion: "procedure", key: "endpointOver", values: { ml: round(overshootMl) } });
  else feedback.push({ criterion: "procedure", key: "endpointUnder", values: { ml: round(-overshootMl) } });

  // 2) Бақылау (25): әр жолдағы «түс» пен «орта» модельмен салыстырылады
  const rows = observationRows(concentration, endpointMl);
  let right = 0;
  rows.forEach((row, i) => {
    if (submission.observations[`r${i}.color`] === row.color) right += 1;
    if (submission.observations[`r${i}.medium`] === row.medium) right += 1;
  });
  const cells = rows.length * 2;
  const observation = (25 * right) / cells;
  feedback.push({
    criterion: "observation",
    key: right === cells ? "observationAll" : "observationSome",
    values: { right, total: cells },
  });

  // 3) Есептеу (20): c(HCl) 12 + эквивалент көлемі 5 + эквивалент нүктесіндегі орта 3
  const answer = parseNumber(submission.answers.concentration);
  // Есептеу дұрыстығы оқушының өз тоқтаған көлемі бойынша тексеріледі (дәлдік — 1-критерийде)
  const concentrationOk =
    withinPercent(answer, concentrationFromEndpoint(endpointMl), 2) || withinPercent(answer, concentration, 2);
  const equivalenceOk = withinPercent(parseNumber(submission.answers.equivalence), equivalenceMl, 2);
  const mediumOk = submission.answers.eqMedium === TITRATION_KEY.eqMedium;
  const calc = (concentrationOk ? 12 : 0) + (equivalenceOk ? 5 : 0) + (mediumOk ? 3 : 0);
  feedback.push({ criterion: "calc", key: concentrationOk ? "concentrationOk" : "concentrationWrong" });
  feedback.push({ criterion: "calc", key: equivalenceOk ? "equivalenceOk" : "equivalenceWrong" });
  feedback.push({ criterion: "calc", key: mediumOk ? "mediumOk" : "mediumWrong" });

  // 4) Қорытынды (25): алдын ала, ереже бойынша (3-сессияда AI)
  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["эквивалент", "equivalen"],
      ["индикатор", "фенолфталеин", "indicator", "phenolphthalein"],
      ["бейтарап", "нейтрал", "neutral"],
    ],
    expectedNumbers: [answer ?? 0, concentration, equivalenceMl, endpointMl],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown: ScoreBreakdown = totalScore({
    procedure: equipment.score + endpoint,
    observation,
    calc,
    conclusion: conclusion.score,
  });

  const reveal: TitrationReveal = {
    trueConcentration: round(concentration, 3),
    equivalenceMl: round(equivalenceMl),
    endpointMl: round(endpointMl),
    overshootMl: round(overshootMl),
    answerErrorPct: answer === null ? null : round((Math.abs(answer - concentration) / concentration) * 100, 1),
    predictionCorrect: submission.prediction ? submission.prediction === TITRATION_KEY.prediction : null,
  };

  return { breakdown, feedback, reveal };
}
