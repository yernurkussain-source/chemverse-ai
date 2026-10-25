/**
 * Олимпиада тапсырмасы (OLYMPIAD_SPEC 9-бөлім): тақырып не нақты есептер жиыны, генератор есептері бекітілген seed-пен
 * (барлық оқушыға бірдей сандар). assignments.olympiad бағанында сақталады.
 */
export type AssignmentItem = { problemId: string } | { generator: string; seed: number };
export type OlympiadAssignment = { topic: number; items: AssignmentItem[] };

/** olympiad_attempts-тегі (problem_id, seed) кілті */
export const itemKey = (item: AssignmentItem) => ("problemId" in item ? `${item.problemId}|` : `gen:${item.generator}|${item.seed}`);
export const attemptKey = (a: { problem_id: string; seed: number | null }) => `${a.problem_id}|${a.seed ?? ""}`;

/** Орындалды: тапсырма берілгеннен кейін әр есеп кемінде бір рет дұрыс шығарылған */
export function isAssignmentDone(items: AssignmentItem[], attempts: { problem_id: string; seed: number | null; correct: boolean; created_at: string }[], since: string) {
  const solved = new Set(attempts.filter((a) => a.correct && a.created_at >= since).map(attemptKey));
  return items.length > 0 && items.every((item) => solved.has(itemKey(item)));
}
