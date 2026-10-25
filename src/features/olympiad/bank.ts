import { z } from "zod";
import { balance, checkCoefficients, checkNumeric, econf, type BankProblem } from "./core";
import { rubricMax } from "./practice";

/**
 * Есепті жарияламас бұрын тексеру (OLYMPIAD_SPEC 5.3, 13-бөлім): пішімі + тексергіштер (validate-bank.js-тің ережелері).
 * Мұғалім редакторы мен JSON импорты осыны қолданады. Себептер мұғалімге көрсетіледі.
 */
const base = z.object({
  id: z.string().regex(/^[\w-]{1,40}$/),
  topic: z.number().int().min(1).max(32),
  level: z.number().int().min(1).max(3),
  kk: z.string().trim().min(5).max(2000),
  solution: z.array(z.string().max(1000)).min(1).max(12),
  hints: z.array(z.string().trim().min(1).max(500)).length(3),
});
const schema = z.discriminatedUnion("type", [
  base.extend({ type: z.literal("numeric"), answer: z.object({ value: z.number().finite(), unit: z.string().max(20), tol: z.number().min(0).max(0.2).optional() }) }),
  base.extend({ type: z.literal("mcq"), choices: z.array(z.string().trim().min(1).max(300)).min(2).max(5), correct: z.number().int().min(0) }),
  base.extend({ type: z.literal("balance"), equation: z.string().max(200), coeffs: z.array(z.number().int().positive()).min(2).max(12) }),
  base.extend({ type: z.literal("econf"), Z: z.number().int().min(1).max(54), unpaired: z.number().int().min(0) }),
  base.extend({ type: z.literal("open"), rubric: z.array(z.string().trim().min(1).max(500)).min(3).max(10) }),
]);

export type ProblemCheck = { ok: true; problem: BankProblem } | { ok: false; reason: string };

export function validateProblem(raw: unknown): ProblemCheck {
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { ok: false, reason: `Өріс қате: ${issue.path.join(".") || "type"}` };
  }
  const p = parsed.data as BankProblem;
  try {
    if (p.type === "balance") {
      const right = balance(p.equation);
      if (!right) return { ok: false, reason: "Теңдеуді теңестіру мүмкін емес — заттарды тексеріңіз" };
      if (right.join() !== p.coeffs.join()) return { ok: false, reason: `Коэффициенттер дұрыс емес, тексергіш бойынша: ${right.join(", ")}` };
      if (!checkCoefficients(p.equation, p.coeffs).ok) return { ok: false, reason: "Коэффициенттер тексерілмеді" };
    }
    if (p.type === "econf" && econf(p.Z).unpaired !== p.unpaired) return { ok: false, reason: `Жұпталмаған электрондар саны: ${econf(p.Z).unpaired}` };
  } catch (error) {
    return { ok: false, reason: (error as Error).message };
  }
  if (p.type === "mcq" && p.correct >= p.choices.length) return { ok: false, reason: "Дұрыс жауаптың нөмірі нұсқалар санынан үлкен" };
  if (p.type === "numeric" && !checkNumeric(String(p.answer.value).replace(".", ","), p.answer.value, p.answer.tol).ok) {
    return { ok: false, reason: "Сандық жауап өзін-өзі тексеруден өтпеді" };
  }
  if (p.type === "open" && rubricMax(p.rubric) <= 0) return { ok: false, reason: "Рубрикада ұпай жоқ: әр жолдың соңына «— 2 ұпай» жазыңыз" };
  return { ok: true, problem: p };
}
