import { randomInt } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { generate, GEN } from "@/features/olympiad/core";

/**
 * Генератордан жаңа есеп: GET /api/olympiad/generate?id=faraday&seed=3 (seed жоқ болса — кездейсоқ).
 * Тек шарты мен бірлігі жіберіледі: answer, steps, formula, tol — серверде қалады (тексеру /api/olympiad/check).
 */
export function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  if (!Object.hasOwn(GEN, id)) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const seedParam = request.nextUrl.searchParams.get("seed");
  const seed = seedParam === null ? randomInt(1, 2 ** 31) : Number(seedParam);
  if (!Number.isSafeInteger(seed)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const problem = generate(id, seed);
  return NextResponse.json({ id, seed, topic: problem.topic, kk: problem.kk, unit: problem.unit });
}
