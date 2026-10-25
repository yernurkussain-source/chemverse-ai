import { NextResponse } from "next/server";
import { hasLocale } from "next-intl";
import { z } from "zod";
import { checkAnswer, checkNumeric, generate, GEN, type BankProblem, type CheckResult } from "@/features/olympiad/core";
import { GENERATOR_LEVEL, rubricMax } from "@/features/olympiad/practice";
import { aiRubricScore } from "@/features/olympiad/server/ai";
import { recordAttempt } from "@/features/olympiad/server/mastery";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Ашық жауапты AI бағалайды — ұзағырақ күтуге рұқсат
export const maxDuration = 60;

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// reveal — «Шешімін көру»: жауапсыз, қате деп есептеледі (есеп қателер дәптеріне түседі)
const common = { hintsUsed: z.number().int().min(0).max(3).default(0), reveal: z.boolean().default(false), locale: z.string().max(5).optional() };
// Банк есебі: { problemId, answer } · генератор есебі: { generator, seed, answer }
const requestSchema = z.union([
  z.object({ problemId: z.string().max(40), answer: z.unknown().optional(), ...common }),
  z.object({ generator: z.string().max(40), seed: z.number().int(), answer: z.union([z.string().max(40), z.number()]).optional(), ...common }),
]);
const openAnswerSchema = z.string().trim().min(1).max(4000);

export type CheckResponse = CheckResult & {
  /** Шешім қадамдары — тек дұрыс жауаптан кейін, «Шешімін көру» басылғанда не ашық жауап жіберілгенде */
  solution?: string[];
  /** Жаңа меңгеру деңгейі (кірген оқушыға) */
  mastery?: number | null;
  /** Ашық жауап: мұғалімге жіберілді, AI алдын ала бағасы (бапталмаса — null) */
  open?: { ai: { score: number; feedback: string } | null; maxScore: number; rubric: string[] };
};

/** Олимпиада есебінің жауабын серверде тексеру: дұрыс жауап клиентке ешқашан жіберілмейді */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", 400);
  const body = parsed.data;
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();

  let result: CheckResult;
  let solution: string[];
  let attempt: { problemId: string; seed: number | null; topic: number; level: number };

  if ("generator" in body) {
    // Генератор есебі seed бойынша серверде қайта құрылады (бір seed — әрқашан бір есеп)
    if (!Object.hasOwn(GEN, body.generator)) return fail("not_found", 404);
    if (!body.reveal && body.answer === undefined) return fail("bad_request", 400);
    const problem = generate(body.generator, body.seed);
    result = body.reveal || body.answer === undefined ? { ok: false } : checkNumeric(body.answer, problem.answer, problem.tol);
    solution = problem.steps;
    attempt = { problemId: `gen:${body.generator}`, seed: body.seed, topic: problem.topic, level: GENERATOR_LEVEL };
  } else {
    if (!admin) return fail("not_configured", 503);
    const { data } = await admin
      .from("olympiad_problems")
      .select("body")
      .eq("id", body.problemId)
      .eq("status", "published")
      .maybeSingle<{ body: BankProblem }>();
    if (!data) return fail("not_found", 404);
    const problem = data.body;

    // Ашық жауап: AI алдын ала бағалайды, мұғалім бекітеді — сондықтан тек кірген оқушыдан
    if (problem.type === "open") {
      if (!auth.user) return fail("login_required", 401);
      const answer = openAnswerSchema.safeParse(body.answer);
      if (!answer.success) return fail("bad_request", 400);
      const maxScore = rubricMax(problem.rubric);
      const locale = hasLocale(routing.locales, body.locale) ? body.locale : routing.defaultLocale;
      const ai = await aiRubricScore(admin, auth.user.id, {
        problem: problem.kk,
        rubric: problem.rubric,
        solution: problem.solution,
        answer: answer.data,
        maxScore,
        locale,
      });
      const { error } = await admin.from("olympiad_open_answers").insert({
        user_id: auth.user.id,
        problem_id: problem.id,
        answer: answer.data,
        max_score: maxScore,
        ai_score: ai?.score ?? null,
        ai_feedback: ai?.feedback ?? null,
      });
      if (error) {
        console.error("Олимпиада: ашық жауап сақталмады", error);
        return fail("not_configured", 503);
      }
      const response: CheckResponse = { ok: false, solution: problem.solution, open: { ai, maxScore, rubric: problem.rubric } };
      return NextResponse.json(response);
    }

    // null — жауап пішімі қате
    const checked = body.reveal ? { ok: false } : checkAnswer(problem, body.answer);
    if (!checked) return fail("bad_request", 400);
    result = checked;
    solution = problem.solution;
    attempt = { problemId: problem.id, seed: null, topic: problem.topic, level: problem.level };
  }

  // Кірген оқушының жауабы мен меңгеру деңгейі сақталады (қонақтікі — жоқ)
  const mastery =
    auth.user && admin
      ? await recordAttempt(admin, auth.user.id, {
          ...attempt,
          answer: body.reveal ? null : body.answer,
          correct: result.ok,
          hintsUsed: body.hintsUsed,
        })
      : null;

  const response: CheckResponse = { ...result, solution: result.ok || body.reveal ? solution : undefined, mastery };
  return NextResponse.json(response);
}
