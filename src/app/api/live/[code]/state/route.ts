import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { leaderboard, loadQuestion, correctOptionId, findSessionByCode, participantCookie } from "@/features/live/server";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";

export type StudentLiveState =
  | { status: "not_found" }
  | {
      status: "ok";
      phase: "lobby" | "question" | "reveal" | "finished";
      index: number;
      total: number;
      secondsPerQuestion: number;
      questionStartedAt: string | null;
      serverNow: number;
      question: { id: string; body: string; options: { id: string; label: string; body: string }[] } | null;
      /** Тек «жауапты көрсету» кезеңінде */
      correctOptionId: string | null;
      me: {
        name: string;
        score: number;
        rank: number;
        answeredOptionId: string | null;
        lastCorrect: boolean | null;
        lastPoints: number;
      } | null;
      players: number;
      podium: { name: string; score: number }[];
    };

/** Оқушы телефонындағы күй. Дұрыс жауап сұрақ ашық тұрғанда ЖІБЕРІЛМЕЙДІ */
export async function GET(request: NextRequest, { params }: RouteContext<"/api/live/[code]/state">) {
  const { code } = await params;
  const localeParam = request.nextUrl.searchParams.get("locale") ?? "";
  const locale = hasLocale(routing.locales, localeParam) ? localeParam : routing.defaultLocale;

  const admin = createAdminClient();
  const session = admin ? await findSessionByCode(admin, code) : null;
  if (!admin || !session) return NextResponse.json({ status: "not_found" } satisfies StudentLiveState);

  const participantId = (await cookies()).get(participantCookie(code))?.value ?? null;
  const questionId = session.phase === "lobby" ? null : (session.question_ids[session.current_question] ?? null);
  const showQuestion = session.phase === "question" || session.phase === "reveal";

  const [board, question, correctId, myAnswer] = await Promise.all([
    leaderboard(admin, session.id),
    showQuestion && questionId ? loadQuestion(admin, questionId, locale) : Promise.resolve(null),
    session.phase === "reveal" && questionId ? correctOptionId(admin, questionId) : Promise.resolve(null),
    participantId && questionId
      ? admin
          .from("live_responses")
          .select("answer, is_correct, points")
          .eq("participant_id", participantId)
          .eq("question_id", questionId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rank = participantId ? board.findIndex((p) => p.id === participantId) : -1;
  const me = rank >= 0 ? board[rank] : null;
  const answer = myAnswer.data as { answer: string; is_correct: boolean; points: number } | null;
  const answeredOptionId = answer && question ? (question.options.find((o) => o.label === answer.answer)?.id ?? null) : null;
  const revealed = session.phase === "reveal" || session.phase === "finished";

  const state: StudentLiveState = {
    status: "ok",
    phase: session.phase,
    index: session.current_question,
    total: session.question_ids.length,
    secondsPerQuestion: session.seconds_per_question,
    questionStartedAt: session.question_started_at,
    serverNow: Date.now(),
    question: showQuestion ? question : null,
    correctOptionId: correctId,
    me: me
      ? {
          name: me.name,
          score: me.score,
          rank: rank + 1,
          answeredOptionId,
          // Дұрыс-бұрысы мен ұпайы тек жауап көрсетілгеннен кейін
          lastCorrect: revealed && answer ? answer.is_correct : null,
          lastPoints: revealed && answer ? answer.points : 0,
        }
      : null,
    players: board.length,
    podium: session.phase === "finished" ? board.slice(0, 3).map(({ name, score }) => ({ name, score })) : [],
  };
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
