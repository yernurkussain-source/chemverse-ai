// ---------- 6. Жауап тексергіштер (серверде шақырылады: /api/olympiad/check) ----------
import { z } from "zod";
import { checkCoefficients, type CheckResult } from "./balance";
import { econf } from "./econf";

// Оқушы жауабын тексеру: сан, бірлік қатесі, дөңгелектеу
// tol — салыстырмалы рұқсат (0,01 = 1 %); tol = 0 — дәл сәйкестік
export function checkNumeric(user: string | number, answer: number, tol = 0.01): CheckResult { const u = typeof user === 'string' ? parseFloat(user.replace(',', '.')) : user; if (!isFinite(u)) return { ok: false, reason: 'Сан енгіз' };
  const ok = Math.abs(u - answer) <= tol * Math.abs(answer) + 1e-9; if (ok) return { ok: true };
  for (const k of [1000, 0.001, 100, 0.01]) if (Math.abs(u - answer * k) <= tol * Math.abs(answer * k)) return { ok: false, reason: 'Бірлікті тексер (мысалы, г ↔ кг, мл ↔ л)' };
  return { ok: false, reason: 'Жауап дұрыс емес' }; }

/** Деңгейшелер толтырылуы (1s, 2s, 2p, …) және жұпталмаған электрондар саны econf(Z)-пен бірдей ме */
export function checkEconf(Z: number, occ: Record<string, number>, unpaired: number): CheckResult {
  const right = econf(Z);
  const keys = new Set([...Object.keys(right.occ), ...Object.keys(occ)]);
  const bad = [...keys].filter((k) => (occ[k] ?? 0) !== (right.occ[k] ?? 0));
  if (bad.length) return { ok: false, reason: 'Деңгейшелер қате толтырылған: ' + bad.join(', ') };
  if (unpaired !== right.unpaired) return { ok: false, reason: 'Жұпталмаған электрондар саны қате' };
  return { ok: true };
}

/** PROBLEMS.json-дағы есеп (олимпиада банкі) */
type ProblemBase = { id: string; topic: number; level: number; kk: string; solution: string[]; hints: string[] };
export type BankProblem = ProblemBase &
  (
    | { type: "numeric"; answer: { value: number; unit: string; tol?: number } }
    | { type: "mcq"; choices: string[]; correct: number }
    | { type: "balance"; equation: string; coeffs: number[] }
    | { type: "econf"; Z: number; unpaired: number }
    | { type: "open"; rubric: string[] }
  );

// Клиенттен келген жауаптың пішімі (оған сенбейміз)
const answerSchema = {
  numeric: z.union([z.string().max(40), z.number()]),
  mcq: z.number().int(),
  balance: z.array(z.number()).max(20),
  econf: z.object({ occ: z.record(z.string().max(4), z.number()), unpaired: z.number() }),
};

/** Банк есебінің жауабын тексеру. Жауап пішімі қате болса не есеп ашық (open — мұғалім бағалайды) болса → null */
export function checkAnswer(problem: BankProblem, raw: unknown): CheckResult | null {
  switch (problem.type) {
    case "numeric": {
      const a = answerSchema.numeric.safeParse(raw);
      return a.success ? checkNumeric(a.data, problem.answer.value, problem.answer.tol) : null;
    }
    case "mcq": {
      const a = answerSchema.mcq.safeParse(raw);
      return a.success ? (a.data === problem.correct ? { ok: true } : { ok: false, reason: "Жауап дұрыс емес" }) : null;
    }
    case "balance": {
      const a = answerSchema.balance.safeParse(raw);
      return a.success ? checkCoefficients(problem.equation, a.data) : null;
    }
    case "econf": {
      const a = answerSchema.econf.safeParse(raw);
      return a.success ? checkEconf(problem.Z, a.data.occ, a.data.unpaired) : null;
    }
    default:
      return null;
  }
}
