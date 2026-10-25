import { generate, type BankProblem } from "./core";

/** Код тексеретін есеп түрлері (open — мұғалім бағалайды, 3-сессия) */
export type CheckableType = "numeric" | "mcq" | "balance" | "econf";

/** Оқушыға жіберілетін есеп: дұрыс жауапсыз және шешімсіз (тексеру — /api/olympiad/check) */
export type PublicProblem = {
  /** Бірегей кілт: "T05-01" не "gen:faraday:123" */
  key: string;
  problemId?: string;
  generator?: string;
  seed?: number;
  topic: number;
  level: number;
  type: CheckableType;
  kk: string;
  hints: string[];
  unit?: string;
  choices?: string[];
  /** balance: заттар тізімі осыдан алынады (коэффициенттерсіз) */
  equation?: string;
};

/** Генератор есептерінің деңгейі (банкте 1–3) */
export const GENERATOR_LEVEL = 2;

/** Банк есебі → оқушыға көрінетін нұсқасы; ашық есеп → null */
export function toPublic(p: BankProblem): PublicProblem | null {
  const base = { key: p.id, problemId: p.id, topic: p.topic, level: p.level, kk: p.kk, hints: p.hints };
  switch (p.type) {
    case "numeric":
      return { ...base, type: p.type, unit: p.answer.unit };
    case "mcq":
      return { ...base, type: p.type, choices: p.choices };
    case "balance":
      return { ...base, type: p.type, equation: p.equation };
    case "econf":
      return { ...base, type: p.type };
    default:
      return null;
  }
}

/** Генератор есебі (seed бойынша) → тек шарты мен бірлігі */
export function generatedProblem(id: string, seed: number): PublicProblem {
  const g = generate(id, seed);
  return { key: `gen:${id}:${seed}`, generator: id, seed, topic: g.topic, level: GENERATOR_LEVEL, type: "numeric", kk: g.kk, hints: [], unit: g.unit };
}

/** olympiad_attempts.problem_id: банк есебінің id-і не "gen:<генератор>" (seed бөлек бағанда) */
export const attemptProblemId = (p: { problemId?: string; generator?: string }) => p.problemId ?? `gen:${p.generator}`;

/** Меңгеру деңгейіне қарай бастапқы қиындық: 0–39 → 1, 40–69 → 2, 70+ → 3 */
export const targetLevel = (mastery: number) => (mastery < 40 ? 1 : mastery < 70 ? 2 : 3);

/** Бейімделген реттілік: алдымен оқушының деңгейіне жақын есептер, сосын жеңілден қиынға */
export const adaptiveOrder = (problems: PublicProblem[], mastery: number) => {
  const target = targetLevel(mastery);
  return [...problems].sort((a, b) => Math.abs(a.level - target) - Math.abs(b.level - target) || a.level - b.level);
};

/** Өзін-өзі тексеру: 5 сұрақ (mcq + numeric) — алдымен банктен, жетпесе генератордан */
export const SELF_CHECK_SIZE = 5;
export const selfCheckSet = (bank: PublicProblem[], generated: PublicProblem[]) =>
  [...bank.filter((p) => p.type === "mcq" || p.type === "numeric"), ...generated].slice(0, SELF_CHECK_SIZE);
