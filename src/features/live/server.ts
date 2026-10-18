import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/routing";

/**
 * Live сабақтың серверлік бөлігі (тек әкімші клиентімен: оқушылар тіркеусіз, RLS арқылы кіре алмайды).
 * Realtime: барлық өзгеріс тек «сигнал» ретінде таратылады, ал нақты күйді әр клиент серверден сұрайды —
 * сондықтан біреу жалған хабар жіберсе де, ештеңе бұзылмайды.
 */

export type LivePhase = "lobby" | "question" | "reveal" | "finished";

export type LiveSessionRow = {
  id: string;
  teacher_id: string;
  exam_id: string | null;
  code: string;
  phase: LivePhase;
  current_question: number;
  question_ids: string[];
  question_started_at: string | null;
  seconds_per_question: number;
};

export const SESSION_COLUMNS =
  "id, teacher_id, exam_id, code, phase, current_question, question_ids, question_started_at, seconds_per_question";

export const CODE_PATTERN = /^\d{6}$/;
export const MAX_PARTICIPANTS = 200;
/** Желі кідірісі үшін таймерден кейін берілетін қосымша уақыт */
export const ANSWER_GRACE_MS = 2_000;

export const participantCookie = (code: string) => `live_p_${code}`;
export const channelName = (code: string) => `live-${code}`;

export async function findSessionByCode(admin: SupabaseClient, code: string) {
  if (!CODE_PATTERN.test(code)) return null;
  const { data } = await admin
    .from("live_sessions")
    .select(SESSION_COLUMNS)
    .eq("code", code)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle<LiveSessionRow>();
  return data;
}

/** Барлық қатысушыға «күй өзгерді» сигналы (Supabase Realtime Broadcast, REST арқылы) */
export async function broadcast(admin: SupabaseClient, code: string, event: "state" | "answer" | "join") {
  const channel = admin.channel(channelName(code));
  const result = await channel.httpSend(event, { at: Date.now() });
  if (!result.success) console.error("Realtime сигнал жіберілмеді:", result.error);
  await admin.removeChannel(channel);
}

type Localized = Record<string, unknown>;
const pick = (row: Localized, field: string, locale: Locale) =>
  (row[`${field}_${locale}`] as string | null) || (row[`${field}_kk`] as string | null) || "";

export type LiveQuestion = { id: string; body: string; options: { id: string; label: string; body: string }[] };

/** Сұрақ мәтіні мен нұсқалар — дұрыс жауапсыз */
export async function loadQuestion(admin: SupabaseClient, questionId: string, locale: Locale): Promise<LiveQuestion | null> {
  const [{ data: q }, { data: options }] = await Promise.all([
    admin.from("questions").select("id, body_kk, body_ru, body_en").eq("id", questionId).maybeSingle(),
    admin.from("question_options").select("id, label, body_kk, body_ru, body_en").eq("question_id", questionId).order("label"),
  ]);
  if (!q) return null;
  return {
    id: q.id as string,
    body: pick(q, "body", locale),
    options: (options ?? []).map((o) => ({ id: o.id as string, label: o.label as string, body: pick(o, "body", locale) })),
  };
}

export async function correctOptionId(admin: SupabaseClient, questionId: string) {
  const { data } = await admin
    .from("question_options")
    .select("id")
    .eq("question_id", questionId)
    .eq("is_correct", true)
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export type LeaderboardRow = { id: string; name: string; score: number };

export async function leaderboard(admin: SupabaseClient, sessionId: string, limit = 200): Promise<LeaderboardRow[]> {
  const { data } = await admin
    .from("live_participants")
    .select("id, name, score")
    .eq("session_id", sessionId)
    .order("score", { ascending: false })
    .order("created_at")
    .limit(limit);
  return (data ?? []) as LeaderboardRow[];
}

/** Ұпай: дұрыс жауапқа 500–1000, неғұрлым жылдам болса, соғұрлым көп (Kahoot сияқты) */
export function pointsFor(correct: boolean, elapsedMs: number, limitMs: number) {
  if (!correct) return 0;
  const speed = Math.max(0, 1 - elapsedMs / limitMs);
  return Math.round(500 + 500 * speed);
}
