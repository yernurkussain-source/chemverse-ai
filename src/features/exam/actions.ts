"use server";

import { randomInt } from "node:crypto";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { DEADLINE_GRACE_MS, finalizeSession, isPastDeadline, type SessionRow } from "./grading";

function readLocale(formData: FormData): Locale {
  const value = String(formData.get("locale") ?? "");
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Сұрақтардың ретін араластыру (Фишер–Йейтс, криптографиялық кездейсоқтық) */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Тестті бастау: сұрақтар тізімі мен уақыт шегі серверде бекітіледі.
 * Аяқталмаған сессия болса — соны жалғастырады.
 */
export async function startExam(formData: FormData) {
  const locale = readLocale(formData);
  const slug = String(formData.get("slug") ?? "");
  const userId = await currentUserId();
  if (!userId) redirect({ href: "/login", locale });

  const admin = createAdminClient();
  if (!admin || !userId) throw new Error("Supabase is not configured");

  const { data: exam } = await admin
    .from("exams")
    .select("id, duration_minutes")
    .eq("slug", slug)
    .single<{ id: string; duration_minutes: number }>();
  if (!exam) throw new Error(`Exam not found: ${slug}`);

  // Бұрын басталған сессия: уақыты бітпесе — жалғастырамыз, бітсе — бағалап жабамыз
  const { data: open } = await admin
    .from("exam_sessions")
    .select("id, deadline_at")
    .eq("user_id", userId)
    .eq("exam_id", exam.id)
    .eq("status", "in_progress")
    .returns<Pick<SessionRow, "id" | "deadline_at">[]>();
  let sessionId = open?.find((s) => !isPastDeadline(s))?.id;
  for (const stale of open ?? []) {
    if (stale.id !== sessionId) await finalizeSession(admin, stale.id);
  }

  if (!sessionId) {
    const { data: links } = await admin.from("exam_questions").select("question_id").eq("exam_id", exam.id);
    const questionIds = shuffle((links ?? []).map((l) => l.question_id as string));
    // Сұрақсыз тест беті ашылмайды (бос сессия жасамаймыз)
    if (!questionIds.length) throw new Error(`Exam has no questions: ${slug}`);
    const deadline = new Date(Date.now() + exam.duration_minutes * 60_000).toISOString();
    const { data: created, error } = await admin
      .from("exam_sessions")
      .insert({ user_id: userId, exam_id: exam.id, question_ids: questionIds, deadline_at: deadline })
      .select("id")
      .single();
    if (error || !created) throw error ?? new Error("Session was not created");
    sessionId = created.id as string;
  }

  redirect({ href: `/exam/session/${sessionId}`, locale });
}

export type SaveAnswerResult = { ok: true } | { ok: false; error: "expired" | "invalid" | "unknown" };

/**
 * Жауапты сақтау. Дұрыс-бұрысы мұнда ЕСЕПТЕЛМЕЙДІ және клиентке қайтарылмайды —
 * тек тест аяқталғанда (grading.ts).
 */
export async function saveAnswer(sessionId: string, questionId: string, optionId: string | null): Promise<SaveAnswerResult> {
  const userId = await currentUserId();
  const admin = createAdminClient();
  if (!userId || !admin) return { ok: false, error: "invalid" };

  const { data: session } = await admin
    .from("exam_sessions")
    .select("id, user_id, question_ids, status, deadline_at")
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();
  if (!session || session.user_id !== userId || !session.question_ids.includes(questionId)) {
    return { ok: false, error: "invalid" };
  }
  if (session.status !== "in_progress" || isPastDeadline(session, DEADLINE_GRACE_MS)) {
    return { ok: false, error: "expired" };
  }

  if (optionId === null) {
    const { error } = await admin.from("student_answers").delete().eq("session_id", sessionId).eq("question_id", questionId);
    return error ? { ok: false, error: "unknown" } : { ok: true };
  }

  // Нұсқа осы сұрақтікі ме
  const { data: option } = await admin
    .from("question_options")
    .select("id")
    .eq("id", optionId)
    .eq("question_id", questionId)
    .maybeSingle();
  if (!option) return { ok: false, error: "invalid" };

  const { error } = await admin.from("student_answers").upsert(
    { session_id: sessionId, question_id: questionId, option_id: optionId, is_correct: null, answered_at: new Date().toISOString() },
    { onConflict: "session_id,question_id" },
  );
  return error ? { ok: false, error: "unknown" } : { ok: true };
}

/** Тестті аяқтау: серверде бағалап, нәтиже бетіне өтеді */
export async function finishExam(formData: FormData) {
  const locale = readLocale(formData);
  const sessionId = String(formData.get("sessionId") ?? "");
  const userId = await currentUserId();
  const admin = createAdminClient();
  if (!userId || !admin) {
    redirect({ href: "/login", locale });
    return;
  }

  const { data: session } = await admin.from("exam_sessions").select("user_id").eq("id", sessionId).maybeSingle();
  if (session?.user_id !== userId) {
    redirect({ href: "/exam/unt", locale });
    return;
  }

  await finalizeSession(admin, sessionId);
  redirect({ href: `/exam/result/${sessionId}`, locale });
}
