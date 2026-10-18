import { connection } from "next/server";
import type { Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { finalizeSession, isPastDeadline, type SessionRow } from "./grading";
import { WEAK_TOPIC_THRESHOLD } from "./scoring";

type Localized = { [key: string]: unknown };

/** body_kk / body_ru / body_en → таңдалған тілдегі мәтін (жоқ болса қазақшасы) */
function pick(row: Localized, field: string, locale: Locale): string {
  return (row[`${field}_${locale}`] as string | null) || (row[`${field}_kk`] as string | null) || "";
}

const SESSION_COLUMNS = "id, user_id, exam_id, question_ids, status, started_at, deadline_at, finished_at, score, max_score";

export type ExamOverview = {
  id: string;
  slug: string;
  title: string;
  durationMinutes: number;
  questionCount: number;
  topics: string[];
};

/** Тест туралы ақпарат (барлығына ашық) */
export async function getExamOverview(slug: string, locale: Locale): Promise<ExamOverview | null> {
  await connection();
  const supabase = await createClient();
  const { data: exam } = await supabase
    .from("exams")
    .select("id, slug, title_kk, title_ru, title_en, duration_minutes")
    .eq("slug", slug)
    .maybeSingle();
  if (!exam) return null;

  const { data: links } = await supabase
    .from("exam_questions")
    .select("questions(topics(title_kk, title_ru, title_en, position))")
    .eq("exam_id", exam.id)
    .returns<{ questions: { topics: (Localized & { position: number }) | null } | null }[]>();

  const topics = new Map<string, number>();
  for (const link of links ?? []) {
    const topic = link.questions?.topics;
    if (topic) topics.set(pick(topic, "title", locale), topic.position);
  }

  return {
    id: exam.id,
    slug: exam.slug,
    title: pick(exam, "title", locale),
    durationMinutes: exam.duration_minutes,
    questionCount: links?.length ?? 0,
    topics: [...topics].sort((a, b) => a[1] - b[1]).map(([title]) => title),
  };
}

export type RecentSession = Pick<SessionRow, "id" | "status" | "started_at" | "score" | "max_score">;

/** Пайдаланушының осы тесттегі соңғы сессиялары */
export async function getRecentSessions(examId: string) {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("exam_sessions")
    .select("id, status, started_at, score, max_score")
    .eq("user_id", auth.user.id)
    .eq("exam_id", examId)
    .order("started_at", { ascending: false })
    .limit(5)
    .returns<RecentSession[]>();
  return data ?? [];
}

export type ExamQuestion = {
  id: string;
  topic: string;
  body: string;
  options: { id: string; label: string; body: string }[];
};

/** Сұрақтар мен нұсқалар — тек ашық бағандар (is_correct және түсіндірме мұнда жоқ) */
async function loadQuestions(questionIds: string[], locale: Locale): Promise<ExamQuestion[]> {
  const supabase = await createClient();
  const [{ data: questions }, { data: options }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, body_kk, body_ru, body_en, topics(title_kk, title_ru, title_en)")
      .in("id", questionIds)
      .returns<(Localized & { id: string; topics: Localized | null })[]>(),
    supabase
      .from("question_options")
      .select("id, question_id, label, body_kk, body_ru, body_en")
      .in("question_id", questionIds)
      .order("label"),
  ]);

  const byId = new Map((questions ?? []).map((q) => [q.id, q]));
  return questionIds.flatMap((id) => {
    const q = byId.get(id);
    if (!q) return [];
    return [
      {
        id,
        topic: q.topics ? pick(q.topics, "title", locale) : "",
        body: pick(q, "body", locale),
        options: (options ?? [])
          .filter((o) => o.question_id === id)
          .map((o) => ({ id: o.id as string, label: o.label as string, body: pick(o, "body", locale) })),
      },
    ];
  });
}

/**
 * Сессияны иесі үшін оқиды. Уақыты өтіп кеткен болса — серверде бағалап жабады.
 * Қайтарады: null (табылмады / басқа адамдікі) немесе сессия.
 */
async function loadOwnSession(sessionId: string, { allowTeacher = false } = {}) {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  // RLS: тек өз сессиясы немесе (мұғалім үшін) өз оқушысының сессиясы оқылады
  const { data } = await supabase.from("exam_sessions").select(SESSION_COLUMNS).eq("id", sessionId).maybeSingle<SessionRow>();
  if (!data || (!allowTeacher && data.user_id !== auth.user.id)) return null;

  if (data.status === "in_progress" && isPastDeadline(data)) {
    const admin = createAdminClient();
    if (admin) {
      await finalizeSession(admin, sessionId);
      const { data: fresh } = await supabase.from("exam_sessions").select(SESSION_COLUMNS).eq("id", sessionId).single<SessionRow>();
      return fresh;
    }
  }
  return data;
}

export type SessionView = {
  session: SessionRow;
  /** Сервер уақыты (мс): таймер құрылғы сағатына тәуелді болмауы үшін */
  serverNow: number;
  title: string;
  questions: ExamQuestion[];
  answers: Record<string, string>;
};

/** Тест беті үшін: сұрақтар және оқушының осы уақытқа дейінгі жауаптары */
export async function getSessionView(sessionId: string, locale: Locale): Promise<SessionView | null> {
  const session = await loadOwnSession(sessionId);
  if (!session) return null;
  if (session.status !== "in_progress") return { session, serverNow: Date.now(), title: "", questions: [], answers: {} };

  const supabase = await createClient();
  const [questions, { data: answers }, { data: exam }] = await Promise.all([
    loadQuestions(session.question_ids, locale),
    // Тек таңдалған нұсқа — is_correct бағаны оқылмайды
    supabase.from("student_answers").select("question_id, option_id").eq("session_id", sessionId),
    session.exam_id
      ? supabase.from("exams").select("title_kk, title_ru, title_en").eq("id", session.exam_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  return {
    session,
    serverNow: Date.now(),
    title: exam ? pick(exam, "title", locale) : "",
    questions,
    answers: Object.fromEntries(
      (answers ?? []).filter((a) => a.option_id).map((a) => [a.question_id as string, a.option_id as string]),
    ),
  };
}

export type TopicStat = { topic: string; total: number; correct: number; weak: boolean };
export type ReviewItem = ExamQuestion & {
  chosenId: string | null;
  correctId: string | null;
  explanation: string;
};

export type ResultView = {
  session: SessionRow;
  title: string;
  correctCount: number;
  topics: TopicStat[];
  review: ReviewItem[];
};

/** Нәтиже беті: тест аяқталғаннан кейін ғана дұрыс жауаптар мен түсіндірмелер ашылады */
export async function getResultView(sessionId: string, locale: Locale): Promise<ResultView | { inProgress: true } | null> {
  const session = await loadOwnSession(sessionId, { allowTeacher: true });
  if (!session) return null;
  if (session.status === "in_progress") return { inProgress: true };

  const admin = createAdminClient();
  if (!admin) return null;

  const [questions, { data: secrets }, { data: correctOptions }, { data: answers }, { data: exam }] = await Promise.all([
    loadQuestions(session.question_ids, locale),
    admin.from("questions").select("id, explanation_kk, explanation_ru, explanation_en").in("id", session.question_ids),
    admin.from("question_options").select("id, question_id").in("question_id", session.question_ids).eq("is_correct", true),
    admin.from("student_answers").select("question_id, option_id").eq("session_id", sessionId),
    session.exam_id
      ? admin.from("exams").select("title_kk, title_ru, title_en").eq("id", session.exam_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const explanation = new Map((secrets ?? []).map((q) => [q.id as string, pick(q, "explanation", locale)]));
  const correct = new Map((correctOptions ?? []).map((o) => [o.question_id as string, o.id as string]));
  const chosen = new Map((answers ?? []).map((a) => [a.question_id as string, a.option_id as string | null]));

  const review: ReviewItem[] = questions.map((q) => ({
    ...q,
    chosenId: chosen.get(q.id) ?? null,
    correctId: correct.get(q.id) ?? null,
    explanation: explanation.get(q.id) ?? "",
  }));

  // Тақырып бойынша «әлсіз жерлер» картасы
  const stats = new Map<string, { total: number; correct: number }>();
  for (const item of review) {
    const stat = stats.get(item.topic) ?? { total: 0, correct: 0 };
    stat.total += 1;
    if (item.chosenId && item.chosenId === item.correctId) stat.correct += 1;
    stats.set(item.topic, stat);
  }
  const topics = [...stats]
    .map(([topic, s]) => ({ topic, ...s, weak: s.correct / s.total < WEAK_TOPIC_THRESHOLD }))
    .sort((a, b) => a.correct / a.total - b.correct / b.total);

  return {
    session,
    title: exam ? pick(exam, "title", locale) : "",
    correctCount: review.filter((r) => r.chosenId && r.chosenId === r.correctId).length,
    topics,
    review,
  };
}
