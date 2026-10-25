import { MASTERED } from "./server/mastery";

export type RatingRow = { userId: string; name: string; points: number; mastered: number };

/** Рейтинг: ұпай = меңгеру деңгейлерінің қосындысы (кемуі бойынша, тең болса — аты бойынша); mastered — 80+ тақырыптар */
export function buildRating(members: { id: string; name: string }[], mastery: { user_id: string; level: number }[]): RatingRow[] {
  return members
    .map((m) => {
      const levels = mastery.filter((r) => r.user_id === m.id).map((r) => Number(r.level));
      return { userId: m.id, name: m.name, points: Math.round(levels.reduce((a, b) => a + b, 0)), mastered: levels.filter((l) => l >= MASTERED).length };
    })
    .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
}
