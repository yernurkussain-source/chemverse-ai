import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, totalScore, type FeedbackItem } from "../../scoring";
import { chargeFromOption } from "./meta";
import { ATOM_GOALS, LIMITS, describe, parseShells, sameParticles, sameShells, type Particles } from "./model";

/**
 * «Атом құрылысы» бағалауы (docs/chemlab/CHEMLAB_SPEC.md 5.2 және 6-бөлім). ТЕК СЕРВЕРДЕ.
 */
export const ATOM_KEY = {
  equipment: ["proton", "neutron", "electron"],
  prediction: "charge",
  identity: "protons",
  magnesium: "2,8,2",
  oxideElectrons: 10,
} as const;

const particles = z.object({
  p: z.number().int().min(0).max(LIMITS.p),
  n: z.number().int().min(0).max(LIMITS.n),
  e: z.number().int().min(0).max(LIMITS.e),
});

/** Тәжірибе: әр мақсатқа оқушы құрастырған бөлшек (сақталмаса — null) */
export const atomExperimentSchema = z.object({
  goals: z.object({
    carbon12: particles.nullable(),
    sodiumIon: particles.nullable(),
    chlorideIon: particles.nullable(),
  }),
});

export type AtomSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof atomExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

/** Бақылау кестесінің дұрыс мәндері: оқушы құрастырған бөлшек бойынша (A, заряд, қабаттар) */
export function observationRows(goals: AtomSubmission["experiment"]["goals"]) {
  return ATOM_GOALS.map((goal) => {
    const built: Particles | null = goals[goal.id];
    return { goal: goal.id, built, info: built ? describe(built) : null };
  });
}

export function gradeAtom(submission: AtomSubmission) {
  const feedback: FeedbackItem[] = [];
  const { goals } = submission.experiment;

  // 1) Тәжірибені орындау (30): бөлшектерді таңдау 10 + 3 мақсат 20
  const equipment = equipmentScore(submission.equipment, ATOM_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });

  let goalsRight = 0;
  for (const goal of ATOM_GOALS) {
    const built = goals[goal.id];
    const ok = Boolean(built && sameParticles(built, goal.target));
    if (ok) goalsRight += 1;
    feedback.push({ criterion: "procedure", key: ok ? `goalOk.${goal.id}` : `goalWrong.${goal.id}` });
  }

  // 2) Бақылау (25): әр құрастырылған бөлшекке A, заряд, қабаттар (9 ұяшық)
  const rows = observationRows(goals);
  let right = 0;
  rows.forEach((row, i) => {
    if (!row.info) return;
    if (parseNumber(submission.observations[`r${i}.mass`]) === row.info.massNumber) right += 1;
    if (chargeFromOption(submission.observations[`r${i}.charge`] ?? "") === row.info.charge) right += 1;
    if (sameShells(parseShells(submission.observations[`r${i}.shells`] ?? ""), row.info.shells)) right += 1;
  });
  const cells = rows.length * 3;
  feedback.push({ criterion: "observation", key: right === cells ? "observationAll" : "observationSome", values: { right, total: cells } });

  // 3) Есептеу/талдау (20): атом түрі 6 + Mg қабаттары 7 + O²⁻ электрондары 7
  const identityOk = submission.answers.identity === ATOM_KEY.identity;
  const magnesiumOk = submission.answers.magnesium === ATOM_KEY.magnesium;
  const oxideOk = parseNumber(submission.answers.oxideElectrons) === ATOM_KEY.oxideElectrons;
  feedback.push({ criterion: "calc", key: identityOk ? "identityOk" : "identityWrong" });
  feedback.push({ criterion: "calc", key: magnesiumOk ? "magnesiumOk" : "magnesiumWrong" });
  feedback.push({ criterion: "calc", key: oxideOk ? "oxideOk" : "oxideWrong" });

  // 4) Қорытынды (25): алдын ала, ереже бойынша
  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["протон", "proton"],
      ["электрон", "electron"],
      ["заряд", "ион", "charge", "ion"],
    ],
    expectedNumbers: [6, 11, 12, 17, 18, 10, 23, 35],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + (20 * goalsRight) / ATOM_GOALS.length,
    observation: (25 * right) / cells,
    calc: (identityOk ? 6 : 0) + (magnesiumOk ? 7 : 0) + (oxideOk ? 7 : 0),
    conclusion: conclusion.score,
  });

  return {
    breakdown,
    feedback,
    reveal: {
      goalsRight,
      goalsTotal: ATOM_GOALS.length,
      predictionCorrect: submission.prediction ? submission.prediction === ATOM_KEY.prediction : null,
    },
  };
}
