"use server";

import { randomInt } from "node:crypto";
import { cookies } from "next/headers";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  ANSWER_GRACE_MS,
  broadcast,
  correctOptionId,
  findSessionByCode,
  insertLiveSession,
  MAX_PARTICIPANTS,
  participantCookie,
  pointsFor,
  SESSION_COLUMNS,
  type LivePhase,
  type LiveSessionRow,
} from "./server";

export type LiveFormState = {
  error?: "not_teacher" | "missing_fields" | "no_questions" | "not_found" | "finished" | "name_taken" | "full" | "unknown";
  ok?: boolean;
} | null;

const QUESTION_COUNTS = [5, 10, 15] as const;
const SECONDS = [15, 20, 30] as const;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const readLocale = (formData: FormData): Locale => {
  const value = text(formData, "locale");
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Мұғалім Live сессия ашады: тест сұрақтарынан кездейсоқ N сұрақ + бірегей 6 санды код */
export async function createLiveSession(_prev: LiveFormState, formData: FormData): Promise<LiveFormState> {
  const locale = readLocale(formData);
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!admin || !auth.user) return { error: "not_teacher" };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  if (profile?.role !== "teacher") return { error: "not_teacher" };

  const examId = text(formData, "examId");
  const count = Number(text(formData, "count"));
  const seconds = Number(text(formData, "seconds"));
  if (!examId || !(QUESTION_COUNTS as readonly number[]).includes(count) || !(SECONDS as readonly number[]).includes(seconds)) {
    return { error: "missing_fields" };
  }

  const { data: links } = await admin.from("exam_questions").select("question_id").eq("exam_id", examId);
  const questionIds = shuffle((links ?? []).map((l) => l.question_id as string)).slice(0, count);
  if (!questionIds.length) return { error: "no_questions" };

  const sessionId = await insertLiveSession(supabase, {
    teacher_id: auth.user.id,
    exam_id: examId,
    question_ids: questionIds,
    seconds_per_question: seconds,
  });
  if (!sessionId) return { error: "unknown" };

  redirect({ href: `/teacher/live/${sessionId}`, locale });
  return null;
}

export type LiveCommand = "start" | "reveal" | "next" | "finish";

/** Мұғалім сессияны басқарады. RLS: тек өз сессиясын оқи/өзгерте алады */
export async function controlLive(sessionId: string, command: LiveCommand): Promise<{ ok: boolean }> {
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("live_sessions")
    .select(SESSION_COLUMNS)
    .eq("id", sessionId)
    .maybeSingle<LiveSessionRow>();
  if (!admin || !session) return { ok: false };

  const now = new Date().toISOString();
  const last = session.current_question >= session.question_ids.length - 1;
  let update: Partial<Record<string, unknown>> | null = null;
  const to = (phase: LivePhase) => ({ phase, status: phase === "finished" ? "finished" : phase === "lobby" ? "waiting" : "running" });

  if (command === "start" && session.phase === "lobby") {
    update = { ...to("question"), current_question: 0, question_started_at: now };
  } else if (command === "reveal" && session.phase === "question") {
    update = to("reveal");
  } else if (command === "next" && session.phase === "reveal") {
    update = last
      ? { ...to("finished"), finished_at: now }
      : { ...to("question"), current_question: session.current_question + 1, question_started_at: now };
  } else if (command === "finish" && session.phase !== "finished") {
    update = { ...to("finished"), finished_at: now };
  }
  if (!update) return { ok: false };

  // Екі рет басылса да қауіпсіз: кезең өзгермеген болса ғана жаңартамыз
  const { data: changed, error } = await supabase
    .from("live_sessions")
    .update(update)
    .eq("id", sessionId)
    .eq("phase", session.phase)
    .eq("current_question", session.current_question)
    .select("id");
  if (error) {
    console.error("Live басқару қатесі:", error);
    return { ok: false };
  }
  if (changed?.length) await broadcast(admin, session.code, "state");
  return { ok: Boolean(changed?.length) };
}

/** Оқушы тіркеусіз, атымен қосылады. Қатысушы id-і құрылғыда cookie-де сақталады */
export async function joinLive(_prev: LiveFormState, formData: FormData): Promise<LiveFormState> {
  const code = text(formData, "code");
  const name = text(formData, "name").replace(/\s+/g, " ").slice(0, 30);
  if (!name) return { error: "missing_fields" };

  const admin = createAdminClient();
  if (!admin) return { error: "unknown" };
  const session = await findSessionByCode(admin, code);
  if (!session) return { error: "not_found" };
  if (session.phase === "finished") return { error: "finished" };

  const { count } = await admin
    .from("live_participants")
    .select("id", { count: "exact", head: true })
    .eq("session_id", session.id);
  if ((count ?? 0) >= MAX_PARTICIPANTS) return { error: "full" };

  const { data, error } = await admin
    .from("live_participants")
    .insert({ session_id: session.id, name })
    .select("id")
    .single();
  if (error?.code === "23505") return { error: "name_taken" };
  if (error || !data) {
    console.error("Live қосылу қатесі:", error);
    return { error: "unknown" };
  }

  (await cookies()).set(participantCookie(code), data.id as string, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 6,
    path: "/",
  });
  await broadcast(admin, code, "join");
  return { ok: true };
}

export type AnswerResult = { ok: true } | { ok: false; error: "closed" | "already" | "invalid" };

/**
 * Оқушының жауабы. Дұрыс-бұрысын сервер есептейді, бірақ клиентке тек «қабылданды» қайтарады —
 * нәтиже мұғалім «жауапты көрсету» басқанда ғана ашылады.
 */
export async function submitLiveAnswer(code: string, optionId: string): Promise<AnswerResult> {
  const admin = createAdminClient();
  const participantId = (await cookies()).get(participantCookie(code))?.value;
  if (!admin || !participantId) return { ok: false, error: "invalid" };

  const session = await findSessionByCode(admin, code);
  if (!session || session.phase !== "question" || !session.question_started_at) return { ok: false, error: "closed" };

  const elapsed = Date.now() - Date.parse(session.question_started_at);
  const limitMs = session.seconds_per_question * 1000;
  if (elapsed > limitMs + ANSWER_GRACE_MS) return { ok: false, error: "closed" };

  const questionId = session.question_ids[session.current_question];
  const [{ data: participant }, { data: option }, correctId] = await Promise.all([
    admin.from("live_participants").select("id, name, score").eq("id", participantId).eq("session_id", session.id).maybeSingle(),
    admin.from("question_options").select("id, label").eq("id", optionId).eq("question_id", questionId).maybeSingle(),
    correctOptionId(admin, questionId),
  ]);
  if (!participant || !option) return { ok: false, error: "invalid" };

  const correct = option.id === correctId;
  const points = pointsFor(correct, elapsed, limitMs);
  const { error } = await admin.from("live_responses").insert({
    session_id: session.id,
    participant_id: participant.id,
    participant_name: participant.name,
    question_id: questionId,
    answer: option.label,
    ms: Math.max(0, Math.round(elapsed)),
    is_correct: correct,
    points,
  });
  if (error?.code === "23505") return { ok: false, error: "already" };
  if (error) {
    console.error("Live жауап қатесі:", error);
    return { ok: false, error: "invalid" };
  }

  if (points) await admin.from("live_participants").update({ score: (participant.score as number) + points }).eq("id", participant.id);
  await broadcast(admin, code, "answer");
  return { ok: true };
}
