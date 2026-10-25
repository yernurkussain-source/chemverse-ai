import { createHmac } from "node:crypto";
import { z } from "zod";
import { scoreConclusion } from "../../conclusion";
import { equipmentScore, parseNumber, totalScore, withinPercent, type FeedbackItem } from "../../scoring";
import { CANDIDATES, molarMass, revealedIon, SEEN, TESTS } from "./model";

/**
 * «Белгісіз затты анықтау» бағалауы (docs/chemlab/CHEMLAB_SPEC.md 6-бөлім). ТЕК СЕРВЕРДЕ.
 */
export const UNKNOWN_KEY = {
  equipment: ["test-tubes", "rack", "dropper", "nichrome", "burner", "goggles"],
  prediction: "cation",
  hno3: "carbonate",
} as const;

/**
 * Тәжірибенің параметрі — кездейсоқ seed (клиентке ашық). X = HMAC(құпия, seed) — құпиясыз оны есептеу мүмкін емес,
 * сондықтан оқушы devtools арқылы да жауапты көре алмайды; сынақ нәтижесін сервер береді.
 */
export const SEED_MAX = 2 ** 31;
export function unknownIndex(seed: number, secret: string) {
  return createHmac("sha256", `chemlab-unknown:${secret}`).update(String(seed)).digest().readUInt32BE(0) % CANDIDATES.length;
}

export const unknownExperimentSchema = z.object({
  tests: z.array(z.object({ test: z.enum(TESTS), seen: z.enum(SEEN) })).max(60),
});

export type UnknownSubmission = {
  prediction: string | null;
  equipment: string[];
  experiment: z.infer<typeof unknownExperimentSchema>;
  observations: Record<string, string>;
  answers: Record<string, string>;
  conclusion: string;
};

export function gradeUnknown(x: number, submission: UnknownSubmission) {
  const feedback: FeedbackItem[] = [];
  const mass = molarMass(x);

  // 1) Тәжірибе (30): құралдар 10 + бес сынақтың бәрі жасалды 20
  const equipment = equipmentScore(submission.equipment, UNKNOWN_KEY.equipment, 10);
  if (equipment.missing.length) feedback.push({ criterion: "procedure", key: "equipmentMissing", equipment: equipment.missing });
  if (equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentExtra", equipment: equipment.extra });
  if (!equipment.missing.length && !equipment.extra.length) feedback.push({ criterion: "procedure", key: "equipmentPerfect" });
  const done = new Set(submission.experiment.tests.map((t) => t.test)).size;
  feedback.push({ criterion: "procedure", key: "testsDone", values: { count: done, total: TESTS.length } });

  // 2) Бақылау (25): әр сынақ қай ионды көрсетті (клиенттің «seen» мәніне сенбейміз — X бойынша қайта есептейміз)
  const right = TESTS.filter((test, i) => submission.observations[`r${i}.ion`] === revealedIon(x, test)).length;
  feedback.push({
    criterion: "observation",
    key: right === TESTS.length ? "observationAll" : "observationSome",
    values: { right, total: TESTS.length },
  });

  // 3) Талдау (20): формула 8 + молярлық масса 6 (±1%) + HNO₃ 6
  const formulaOk = submission.answers.formula === CANDIDATES[x].id;
  const massOk = withinPercent(parseNumber(submission.answers.molarMass), mass, 1);
  const hno3Ok = submission.answers.hno3 === UNKNOWN_KEY.hno3;
  feedback.push({ criterion: "calc", key: formulaOk ? "unknownFormulaOk" : "unknownFormulaWrong" });
  feedback.push({ criterion: "calc", key: massOk ? "molarMassOk" : "molarMassWrong" });
  feedback.push({ criterion: "calc", key: hno3Ok ? "hno3Ok" : "hno3Wrong" });

  const conclusion = scoreConclusion(submission.conclusion, {
    terms: [
      ["катион", "cation"],
      ["анион", "anion"],
      ["жалын", "пламен", "flame", "тұнба", "осадок", "precipitat"],
    ],
    expectedNumbers: [mass],
  });
  if (conclusion.sentences < 2) feedback.push({ criterion: "conclusion", key: "conclusionShort" });
  if (conclusion.termsFound < conclusion.termsTotal) {
    feedback.push({ criterion: "conclusion", key: "conclusionTerms", values: { found: conclusion.termsFound, total: conclusion.termsTotal } });
  }
  if (!conclusion.numberFound) feedback.push({ criterion: "conclusion", key: "conclusionNoNumber" });
  if (conclusion.score === 25) feedback.push({ criterion: "conclusion", key: "conclusionGood" });

  const breakdown = totalScore({
    procedure: equipment.score + (20 * done) / TESTS.length,
    observation: (25 * right) / TESTS.length,
    calc: (formulaOk ? 8 : 0) + (massOk ? 6 : 0) + (hno3Ok ? 6 : 0),
    conclusion: conclusion.score,
  });

  const reveal: Record<string, number | boolean | null> = {
    unknown: x,
    molarMass: mass,
    predictionCorrect: submission.prediction ? submission.prediction === UNKNOWN_KEY.prediction : null,
  };
  return { breakdown, feedback, reveal };
}
