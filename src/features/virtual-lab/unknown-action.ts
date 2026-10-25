"use server";

import { SEED_MAX, unknownIndex } from "./experiments/unknown-substance/grade";
import { isUnknownTest, observe, type Seen } from "./experiments/unknown-substance/model";
import { labSecret } from "./params-token";

/**
 * «Белгісіз затты анықтау»: бір сынақтың нәтижесі. X клиентке берілмейді — тек байқалған өзгеріс.
 * Seed-тің қолтаңбасы тексерілмейді: басқа seed жіберсе, тек басқа X-тің сынақ нәтижесін алады
 * (бағалау қолтаңбалы токендегі seed бойынша жүреді).
 */
export async function runUnknownTest(seed: unknown, test: unknown): Promise<Seen | null> {
  if (!Number.isInteger(seed) || (seed as number) < 1 || (seed as number) >= SEED_MAX || !isUnknownTest(test)) return null;
  return observe(unknownIndex(seed as number, labSecret()), test);
}
