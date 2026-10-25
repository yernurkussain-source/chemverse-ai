/**
 * «Жас химик-дарын» сайысы (OLYMPIAD_SPEC 7-бөлім, 33-сабақ): Live Class механизмімен өтеді.
 * Раундтардың сұрақтары Live сұрақ банкінде (exams.slug = olympiad-contest-<раунд>) — scripts/seed-olympiad.mjs көшіреді.
 */
export const CONTEST_ROUNDS = ["quick", "problems", "experiment"] as const;
export type ContestRound = (typeof CONTEST_ROUNDS)[number];
export const contestSlug = (round: ContestRound) => `olympiad-contest-${round}`;

export const CONTEST_PER_ROUND = [3, 5, 7] as const;
export const CONTEST_SECONDS = [20, 30, 45, 60] as const;

/** Сұрақтар тізбегіндегі раундтардың басталу орны: [{ round, from }] */
export function roundStarts(questionIds: string[], roundOf: Map<string, ContestRound>) {
  return questionIds.flatMap((id, i) => {
    const round = roundOf.get(id);
    return round && round !== roundOf.get(questionIds[i - 1]) ? [{ round, from: i }] : [];
  });
}
