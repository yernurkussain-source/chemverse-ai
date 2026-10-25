import { NextResponse } from "next/server";
import { z } from "zod";
import { checkAnswer, checkNumeric, generate, GEN, type BankProblem } from "@/features/olympiad/core";
import { createAdminClient } from "@/lib/supabase/admin";

const fail = (error: string, status: number) => NextResponse.json({ error }, { status });

// Банк есебі: { problemId, answer } · генератор есебі: { generator, seed, answer }
const requestSchema = z.union([
  z.object({ problemId: z.string().max(40), answer: z.unknown() }),
  z.object({ generator: z.string().max(40), seed: z.number().int(), answer: z.union([z.string().max(40), z.number()]) }),
]);

/** Олимпиада есебінің жауабын серверде тексеру: дұрыс жауап клиентке ешқашан жіберілмейді → { ok, reason? } */
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail("bad_request", 400);
  const body = parsed.data;

  // Генератор есебі seed бойынша серверде қайта құрылады (бір seed — әрқашан бір есеп)
  if ("generator" in body) {
    if (!Object.hasOwn(GEN, body.generator)) return fail("not_found", 404);
    const problem = generate(body.generator, body.seed);
    return NextResponse.json(checkNumeric(body.answer, problem.answer, problem.tol));
  }

  const admin = createAdminClient();
  if (!admin) return fail("not_configured", 503);
  const { data } = await admin
    .from("olympiad_problems")
    .select("body")
    .eq("id", body.problemId)
    .eq("status", "published")
    .maybeSingle<{ body: BankProblem }>();
  if (!data) return fail("not_found", 404);

  // null — жауап пішімі қате не ашық есеп (оны мұғалім бағалайды)
  const result = checkAnswer(data.body, body.answer);
  return result ? NextResponse.json(result) : fail("bad_request", 400);
}
