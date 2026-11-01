/**
 * Бағалау ережелері (BLUEPRINT 10.5): бір қозғалтқыш, әр тест түрінің өз ережесі.
 * Бұл файл тек серверде қолданылады (grading.ts).
 */
export type ExamType = "unt" | "bbzhm" | "olympiad" | "practice";

/** Тапсырма түрі: бір дұрыс жауап / бір немесе бірнеше дұрыс жауап / сәйкестендіру */
export type QuestionKind = "single" | "multiple" | "matching";

/** Бағаланған тапсырма: total — дұрыс нұсқалар саны, hits — дұрыс таңдалғаны, wrong — қате таңдалғаны */
export type GradedQuestion = { difficulty: number; kind: QuestionKind; total: number; hits: number; wrong: number };

type Rule = {
  /** Бір жауапты сұрақтың ең жоғары ұпайы */
  maxPoints: (difficulty: number) => number;
  /** Бір жауапты сұраққа берілетін ұпай */
  points: (difficulty: number, correct: boolean) => number;
};

const ONE_POINT: Rule = {
  maxPoints: () => 1,
  points: (_difficulty, correct) => (correct ? 1 : 0),
};

const RULES: Record<ExamType, Rule> = {
  // ҰБТ: бір жауапты сұрақ (контекст те) — 1 ұпай
  unt: ONE_POINT,
  bbzhm: ONE_POINT,
  practice: ONE_POINT,
  // Олимпиада: қиындық деңгейіне қарай 1–3 ұпай
  olympiad: {
    maxPoints: (difficulty) => difficulty,
    points: (difficulty, correct) => (correct ? difficulty : 0),
  },
};

/**
 * ҰБТ қағидасы, 18-тармақ: сәйкестендіру және бір/екі/үш дұрыс жауапты тапсырма — 2 / 1 / 0 ұпай.
 * Бәрі дұрыс, қатесіз → 2; ең көбі бір дұрысы қалып, ең көбі бір қате → 1; екі қате немесе тым аз дұрыс → 0.
 */
export function twoPointScore(total: number, hits: number, wrong: number): number {
  if (wrong >= 2 || hits === 0) return 0;
  if (hits === total && wrong === 0) return 2;
  return hits >= total - 1 ? 1 : 0;
}

export function questionMax(examType: ExamType, q: Pick<GradedQuestion, "difficulty" | "kind">) {
  return q.kind === "single" ? (RULES[examType] ?? ONE_POINT).maxPoints(q.difficulty) : 2;
}

export function questionPoints(examType: ExamType, q: GradedQuestion) {
  if (q.kind !== "single") return twoPointScore(q.total, q.hits, q.wrong);
  return (RULES[examType] ?? ONE_POINT).points(q.difficulty, q.hits === q.total && q.hits > 0 && q.wrong === 0);
}

export function scoreExam(examType: ExamType, questions: GradedQuestion[]): { score: number; maxScore: number } {
  return questions.reduce(
    (total, q) => ({
      score: total.score + questionPoints(examType, q),
      maxScore: total.maxScore + questionMax(examType, q),
    }),
    { score: 0, maxScore: 0 },
  );
}

/** Бір тапсыруға банктен алынатын сұрақтар саны (банк кіші болса — бәрі). ҰБТ: 25 + 5 + 5 + 5 (sampling.ts) */
export const SESSION_SIZE: Record<ExamType, number> = { unt: 40, bbzhm: 20, practice: 10, olympiad: 20 };

/** Тест түрінің беті (нәтиже және тест беттеріндегі «артқа» сілтемесі) */
export const EXAM_PAGE: Record<ExamType, string> = { unt: "/exam/unt", bbzhm: "/exam/bbzhm", practice: "/learn", olympiad: "/olympiad" };
/** Сол сілтеменің мәтіні (Exam аударма кілті) */
export const BACK_LABEL = { unt: "untShort", bbzhm: "bbzhmShort", practice: "practiceShort", olympiad: "untShort" } as const satisfies Record<ExamType, string>;

/** Тақырып «әлсіз» деп саналатын шек (дұрыс жауаптар үлесі) */
export const WEAK_TOPIC_THRESHOLD = 0.6;

/** Әр дұрыс жауапқа берілетін XP */
export const XP_PER_CORRECT = 5;
