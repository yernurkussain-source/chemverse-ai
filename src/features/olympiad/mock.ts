import { checkAnswer, type BankProblem } from "./core";

/**
 * Сынақ олимпиада (OLYMPIAD_SPEC 7-бөлім): есеп таңдау және бағалау — таза функциялар (тесттелген).
 * Сынақта тек код тексеретін есептер болады (ашық жауаптарды мұғалім жаттығуда бағалайды).
 */
export type MockConfig = { mode: "auto" | "topics"; problems: string[] };
export const MOCK_DURATIONS = [30, 45, 60, 90] as const;
export const MOCK_COUNTS = [5, 10, 15] as const;
/** Желі кідірісі үшін уақыт біткеннен кейінгі қосымша минут */
export const MOCK_GRACE_MS = 60_000;

type Candidate = Pick<BankProblem, "id" | "topic" | "level" | "type">;

function shuffle<T>(items: T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * auto — әр блоктан 2 есепке дейін, тек 2–3-деңгей; topics — таңдалған тақырыптардан count есеп.
 * Нәтиже тақырып пен деңгей бойынша реттеледі (жеңілден қиынға).
 */
export function pickMockProblems(
  all: Candidate[],
  blockOf: Map<number, string>,
  options: { mode: MockConfig["mode"]; topics: number[]; count: number },
  random: () => number = Math.random,
): string[] {
  const pool = shuffle(all.filter((p) => p.type !== "open"), random);
  let picked: Candidate[];
  if (options.mode === "auto") {
    const perBlock = new Map<string, number>();
    picked = pool.filter((p) => {
      const block = blockOf.get(p.topic) ?? "";
      const taken = perBlock.get(block) ?? 0;
      if (p.level < 2 || taken >= 2) return false;
      perBlock.set(block, taken + 1);
      return true;
    });
  } else {
    picked = pool.filter((p) => options.topics.includes(p.topic)).slice(0, options.count);
  }
  return picked.sort((a, b) => a.topic - b.topic || a.level - b.level).map((p) => p.id);
}

export type MockGrade = {
  score: number;
  max: number;
  results: Record<string, boolean>;
  byTopic: Record<number, { correct: number; total: number }>;
};

/** Бағалау: дұрыс есепке деңгейіне тең ұпай (1–3); жауап жоқ не пішімі қате — қате */
export function gradeMock(problems: BankProblem[], answers: Record<string, unknown>): MockGrade {
  const grade: MockGrade = { score: 0, max: 0, results: {}, byTopic: {} };
  for (const p of problems) {
    const ok = answers[p.id] !== undefined && checkAnswer(p, answers[p.id])?.ok === true;
    const topic = (grade.byTopic[p.topic] ??= { correct: 0, total: 0 });
    topic.total++;
    grade.max += p.level;
    grade.results[p.id] = ok;
    if (ok) {
      grade.score += p.level;
      topic.correct++;
    }
  }
  return grade;
}

/** Қайталау керек тақырыптар: дұрыс жауап 60%-дан аз */
export const weakTopics = (byTopic: MockGrade["byTopic"]) =>
  Object.entries(byTopic)
    .filter(([, v]) => v.correct / v.total < 0.6)
    .map(([n]) => Number(n));
