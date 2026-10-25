import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAnswer, checkNumeric, generate, GEN, type BankProblem, type CheckResult } from "@/features/olympiad/core";
import { GENERATOR_LEVEL } from "@/features/olympiad/practice";
import { recordAttempt } from "@/features/olympiad/server/mastery";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// reveal — «Шешімін көру»: жауапсыз, қате деп есептеледі (есеп қателер дәптеріне түседі)
const common = { hintsUsed: z.number().int().min(0).max(3).default(0), reveal: z.boolean().default(false) };
// Банк есебі: { problemId, answer } · генератор есебі: { generator, seed, answer }
const requestSchema = z.union([
  z.object({ problemId: z.string().max(40), answer: z.unknown().optional(), ...common }),
  z.object({ generator: z.string().max(40), seed: z.number().int(), answer: z.union([z.string().max(40), z.number()]).optional(), ...common }),
]);

export type CheckResponse = CheckResult & {
  /** Шешім қадамдары — тек дұрыс жауаптан кейін не «Шешімін көру» басылғанда */
  solution?: string[];
  /** Жаңа меңгеру деңгейі (кірген оқушыға) */
  mastery?: number | null;
};

/** Олимпиада есебінің жауабын серверде тексеру: дұрыс жауап клиентке ешқашан жіберілмейді */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", 400);
  const body = parsed.data;
  const admin = createAdminClient();

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

    // null — жауап пішімі қате не ашық есеп (оны мұғалім бағалайды)
    const checked = body.reveal ? { ok: false } : checkAnswer(data.body, body.answer);
    if (!checked) return fail("bad_request", 400);
    result = checked;
    solution = data.body.solution;
    attempt = { problemId: data.body.id, seed: null, topic: data.body.topic, level: data.body.level };
  }

  // Кірген оқушының жауабы мен меңгеру деңгейі сақталады (қонақтікі — жоқ)
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
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
