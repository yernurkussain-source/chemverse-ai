import { RUBRIC } from "./scoring";

/**
 * Қорытындыны ереже бойынша АЛДЫН АЛА бағалау (0–25). 3-сессияда AI рубрикасы қосылады;
 * AI қолжетімсіз болса (квота) — осы ереже қалады. Нәтиже интерфейсте «алдын ала» деп белгіленеді.
 *
 *  - көлемі: кемінде 2 сөйлем — 5 ұпай (1 сөйлем — 2);
 *  - ғылыми терминдер: әр топтан кемінде бір сөз — барлығы 10 ұпай;
 *  - нәтиже саны: оқушының алған нәтижесі (±5%) аталған — 10 ұпай.
 */
export const CONCLUSION_MAX_LENGTH = 1500;

export type ConclusionRule = {
  /** Синоним топтары (кіші әріппен, сөздің түбірі жеткілікті; барлық тілде) */
  terms: readonly (readonly string[])[];
  /** Қорытындыда аталуы керек нәтижелер: кез келгені ±5% ішінде болса жеткілікті */
  expectedNumbers: readonly number[];
};

export type ConclusionScore = {
  score: number;
  sentences: number;
  termsFound: number;
  termsTotal: number;
  numberFound: boolean;
};

const NUMBER = /[-+]?\d+(?:[.,]\d+)?/g;

export function countSentences(text: string) {
  return text
    .split(/[.!?…]+(?:\s|$)|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 3).length;
}

export function scoreConclusion(text: string, rule: ConclusionRule): ConclusionScore {
  const clean = text.slice(0, CONCLUSION_MAX_LENGTH).trim();
  const lower = clean.toLowerCase();
  const sentences = countSentences(clean);
  const termsFound = rule.terms.filter((group) => group.some((term) => lower.includes(term))).length;
  const numbers = (clean.match(NUMBER) ?? []).map((n) => Number(n.replace(",", ".")));
  const numberFound = rule.expectedNumbers.some(
    (expected) => expected > 0 && numbers.some((n) => Math.abs(n - expected) <= expected * 0.05),
  );

  const lengthPoints = sentences >= 2 ? 5 : sentences === 1 ? 2 : 0;
  const termPoints = rule.terms.length ? (10 * termsFound) / rule.terms.length : 10;
  const numberPoints = numberFound ? 10 : 0;
  const score = clean ? Math.min(RUBRIC.conclusion, Math.round(lengthPoints + termPoints + numberPoints)) : 0;
  return { score, sentences, termsFound, termsTotal: rule.terms.length, numberFound };
}
