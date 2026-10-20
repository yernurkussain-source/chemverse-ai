import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { correctOptionId, leaderboard, loadQuestion, SESSION_COLUMNS, type LiveSessionRow } from "@/features/live/server";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type HostLiveState = {
  phase: "lobby" | "question" | "reveal" | "finished";
  code: string;
  index: number;
  total: number;
  secondsPerQuestion: number;
  questionStartedAt: string | null;
  serverNow: number;
  question: { id: string; body: string; options: { id: string; label: string; body: string }[] } | null;
  correctOptionId: string | null;
  /** Әр нұсқаға неше жауап (диаграмма) */
  counts: Record<string, number>;
  answered: number;
  players: { name: string; score: number }[];
};

/** Мұғалімнің экраны (проектор). Тек сессияның иесі ғана ала алады (RLS) */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/live/[code]/host">) {
  const { code } = await params;
  const localeParam = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = hasLocale(routing.locales, localeParam) ? localeParam : routing.defaultLocale;

  const supabase = await createClient();
  const { data: session } = await supabase
    .from("live_sessions")
    .select(SESSION_COLUMNS)
    .eq("code", code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<LiveSessionRow>();
  const admin = createAdminClient();
  if (!session || !admin) return new NextResponse("not_found", { status: 404 });

  const questionId = session.phase === "lobby" ? null : (session.question_ids[session.current_question] ?? null);
  const [board, loaded, correctId, responses] = await Promise.all([
    leaderboard(admin, session.id),
    questionId && session.phase !== "finished" ? loadQuestion(admin, questionId, locale, session.id) : Promise.resolve(null),
    questionId && session.phase !== "finished" ? correctOptionId(admin, questionId) : Promise.resolve(null),
    questionId
      ? admin.from("live_responses").select("answer").eq("session_id", session.id).eq("question_id", questionId)
      : Promise.resolve({ data: [] }),
  ]);

  // Жауаптар диаграммасы: дерекқордағы әріп → нұсқа id → саны
  const question = loaded?.question ?? null;
  const counts: Record<string, number> = {};
  for (const option of question?.options ?? []) counts[option.id] = 0;
  for (const r of responses.data ?? []) {
    const optionId = loaded?.optionIdByStoredLabel[r.answer as string];
    if (optionId && optionId in counts) counts[optionId] += 1;
  }

  const state: HostLiveState = {
    phase: session.phase,
    code: session.code,
    index: session.current_question,
    total: session.question_ids.length,
    secondsPerQuestion: session.seconds_per_question,
    questionStartedAt: session.question_started_at,
    serverNow: Date.now(),
    question,
    correctOptionId: correctId,
    counts,
    answered: responses.data?.length ?? 0,
    players: board.map(({ name, score }) => ({ name, score })),
  };
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
