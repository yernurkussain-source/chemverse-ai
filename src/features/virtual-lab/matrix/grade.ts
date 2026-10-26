import { z } from "zod";
import { scoreConclusion, type ConclusionRule } from "../conclusion";
import { equipmentScore, parseNumber, PENALTY_PER_MISTAKE, totalScore, withinAbs, withinPercent, type FeedbackItem } from "../scoring";
import { logOf, matrixProgress, type MatrixSpec } from "./spec";

/**
 * «Матрица» тәжірибесінің ортақ бағалауы (docs/chemlab/CHEMLAB_SPEC.md 6-бөлім). ТЕК СЕРВЕРДЕ.
 * Тәжірибе 30 (құралдар 10 + сынақтар 20), бақылау 25 (кесте ұяшықтары), талдау 20 (сұрақтар), қорытынды 25.
 */
export type CellAnswer = string | { value: number; pct?: number; abs?: number };
export type QuestionKey = { id: string; answer: string; points: number } | { id: string; value: number; pct: number; points: number };

export type MatrixKey = {
  equipment: readonly string[];
  prediction: string;
  /** Бақылау кестесінің жолдары (әдепкі — тәжірибенің жолдары) және әр ұяшықтың күтілетін жауабы */
  observationRows?: number;
  cells: (row: number) => Record<string, CellAnswer>;
  /** Сұрақтардың ұпайларының қосындысы — 20 */
  questions: readonly QuestionKey[];
  conclusion: ConclusionRule;
  reveal?: Record<string, number>;
};

export const matrixExperimentSchema = z.object({
  log: z.array(z.tuple([z.number().int().min(0).max(60), z.string().max(40)])).max(400),
});

export type MatrixSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof matrixExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

const cellOk = (given: string | undefined, expected: CellAnswer) => {
  if (typeof expected === "string") return given === expected;
  const n = parseNumber(given);
  return expected.pct !== undefined ? withinPercent(n, expected.value, expected.pct) : withinAbs(n, expected.value, expected.abs ?? 0);
};

export function gradeMatrix(slug: string, spec: MatrixSpec, key: MatrixKey, submission: MatrixSubmission) {
  const feedback: FeedbackItem[] = [];

  // 1) Тәжірибе (30): құралдар 10 + сынақтар 20 (choose: дұрыс шешілген жолдар, әр қате нұсқа −3)
  const equipment = equipmentScore(submission.equipment, key.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  const progress = matrixProgress(spec, logOf(spec, submission.experiment.log));
  let tests: number;
  if (spec.mode === "explore") {
    tests = (20 * progress.tested) / progress.total;
    feedback.push({ criterion: "procedure", key: "testsDone", values: { count: progress.tested, total: progress.total } });
  } else {
    tests = (20 * progress.solved) / spec.rows.length - PENALTY_PER_MISTAKE * progress.wrong;
    feedback.push({ criterion: "procedure", key: "situationsSolved", values: { count: progress.solved, total: spec.rows.length } });
    if (progress.wrong) feedback.push({ criterion: "procedure", key: "wrongActions", values: { count: progress.wrong } });
  }

  // 2) Бақылау (25): кестенің әр ұяшығы
  const rows = key.observationRows ?? spec.rows.length;
  let right = 0;
  let cells = 0;
  for (let row = 0; row < rows; row++) {
    for (const [col, expected] of Object.entries(key.cells(row))) {
      cells += 1;
      if (cellOk(submission.observations[`r${row}.${col}`], expected)) right += 1;
    }
  }
  feedback.push({ criterion: "observation", key: right === cells ? "observationAll" : "observationSome", values: { right, total: cells } });

  // 3) Талдау (20)
  let calc = 0;
  for (const q of key.questions) {
    const ok = "answer" in q ? submission.answers[q.id] === q.answer : withinPercent(parseNumber(submission.answers[q.id]), q.value, q.pct);
    if (ok) calc += q.points;
    feedback.push({ criterion: "calc", key: `q.${slug}.${q.id}.${ok ? "ok" : "wrong"}` });
  }

  const conclusion = scoreConclusion(submission.conclusion, key.conclusion);
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + tests,
    observation: cells ? (25 * right) / cells : 25,
    calc,
    conclusion: conclusion.score,
  });
  const reveal: Record<string, number | boolean | null> = {
    ...key.reveal,
    predictionCorrect: submission.prediction ? submission.prediction === key.prediction : null,
  };
  return { breakdown, feedback, reveal };
}
