/**
 * Бағалау ережелері (BLUEPRINT 10.5): бір қозғалтқыш, әр тест түрінің өз ережесі.
 * Бұл файл тек серверде қолданылады (grading.ts).
 */
export type ExamType = "unt" | "bbzhm" | "olympiad" | "practice";

type Rule = {
  /** Бір сұрақтың ең жоғары ұпайы */
  maxPoints: (difficulty: number) => number;
  /** Дұрыс жауап үшін берілетін ұпай */
  points: (difficulty: number, correct: boolean) => number;
};

const ONE_POINT: Rule = {
  maxPoints: () => 1,
  points: (_difficulty, correct) => (correct ? 1 : 0),
};

const RULES: Record<ExamType, Rule> = {
  // ҰБТ: бір жауапты сұрақ — 1 ұпай
  unt: ONE_POINT,
  bbzhm: ONE_POINT,
  practice: ONE_POINT,
  // Олимпиада: қиындық деңгейіне қарай 1–3 ұпай
  olympiad: {
    maxPoints: (difficulty) => difficulty,
    points: (difficulty, correct) => (correct ? difficulty : 0),
  },
};

export function scoreExam(
  examType: ExamType,
  questions: { difficulty: number; correct: boolean }[],
): { score: number; maxScore: number } {
  const rule = RULES[examType] ?? ONE_POINT;
  return questions.reduce(
    (total, q) => ({
      score: total.score + rule.points(q.difficulty, q.correct),
      maxScore: total.maxScore + rule.maxPoints(q.difficulty),
    }),
    { score: 0, maxScore: 0 },
  );
}

/** Тақырып «әлсіз» деп саналатын шек (дұрыс жауаптар үлесі) */
export const WEAK_TOPIC_THRESHOLD = 0.6;

/** Әр дұрыс жауапқа берілетін XP */
export const XP_PER_CORRECT = 5;
