import type { SupabaseClient } from "@supabase/supabase-js";
import { awardXp } from "@/features/auth/xp";
import { questionMax, questionPoints, scoreExam, XP_PER_CORRECT, type ExamType, type QuestionKind } from "./scoring";
import { examBadges, grantBadges } from "@/features/auth/badges";

/** Жауап мерзімі өткеннен кейін желі кідірісіне берілетін қосымша уақыт */
export const DEADLINE_GRACE_MS = 5_000;

export type SessionRow = {
  id: string;
  user_id: string;
  exam_id: string | null;
  question_ids: string[];
  status: "in_progress" | "finished" | "expired";
  started_at: string;
  deadline_at: string | null;
  finished_at: string | null;
  score: number | null;
  max_score: number | null;
};

export const isPastDeadline = (session: Pick<SessionRow, "deadline_at">, graceMs = 0) =>
  Boolean(session.deadline_at && Date.now() > new Date(session.deadline_at).getTime() + graceMs);

/**
 * Тестті аяқтап, серверде бағалайды (әкімші клиенті керек — дұрыс жауаптар тек осында оқылады).
 * Екі рет шақырылса да қауіпсіз: сессия тек бір рет «in_progress» күйінен шығады.
 */
export async function finalizeSession(admin: SupabaseClient, sessionId: string) {
  const { data: session } = await admin
    .from("exam_sessions")
    .select("id, user_id, exam_id, question_ids, status, deadline_at")
    .eq("id", sessionId)
    .single<SessionRow>();
  if (!session || session.status !== "in_progress") return;

  const questionIds = session.question_ids;
  const [{ data: exam }, { data: questions }, { data: correctOptions }, { data: answers }] = await Promise.all([
    session.exam_id
      ? admin.from("exams").select("exam_type").eq("id", session.exam_id).single<{ exam_type: ExamType }>()
      : Promise.resolve({ data: null }),
    admin.from("questions").select("id, topic_id, difficulty, kind").in("id", questionIds),
    admin.from("question_options").select("id, question_id").in("question_id", questionIds).eq("is_correct", true),
    admin.from("student_answers").select("question_id, option_id, option_ids").eq("session_id", sessionId),
  ]);
  const examType = exam?.exam_type ?? "unt";

  const correctIds = new Map<string, Set<string>>();
  for (const o of correctOptions ?? []) {
    const set = correctIds.get(o.question_id as string) ?? new Set<string>();
    correctIds.set(o.question_id as string, set.add(o.id as string));
  }
  const chosenRows = new Map((answers ?? []).map((a) => [a.question_id as string, a]));
  const graded = (questions ?? []).map((q) => {
    const row = chosenRows.get(q.id);
    const chosen = row ? chosenIds(row) : [];
    const correct = correctIds.get(q.id) ?? new Set<string>();
    const hits = chosen.filter((id) => correct.has(id)).length;
    const item = {
      id: q.id as string,
      topicId: q.topic_id as string,
      difficulty: q.difficulty as number,
      kind: ((q.kind as QuestionKind | null) ?? "single") as QuestionKind,
      total: correct.size,
      hits,
      wrong: chosen.length - hits,
    };
    return { ...item, answered: chosen.length > 0, correct: questionPoints(examType, item) === questionMax(examType, item) };
  });

  const { score, maxScore } = scoreExam(examType, graded);
  const expired = isPastDeadline(session, DEADLINE_GRACE_MS);

  // Алдымен сессияны жабамыз: басқа сұраныс бізден бұрын жапса — қайта есептемейміз
  const { data: closed } = await admin
    .from("exam_sessions")
    .update({
      status: expired ? "expired" : "finished",
      finished_at: new Date().toISOString(),
      score,
      max_score: maxScore,
    })
    .eq("id", sessionId)
    .eq("status", "in_progress")
    .select("id");
  if (!closed?.length) return;

  // Әр жауаптың дұрыс/қате белгісі (тест кезінде клиентке көрінбеуі үшін тек енді жазылады)
  const answeredRows = graded
    .filter((q) => q.answered)
    .map((q) => ({ ...chosenRows.get(q.id), session_id: sessionId, question_id: q.id, is_correct: q.correct }));
  if (answeredRows.length) {
    await admin.from("student_answers").upsert(answeredRows, { onConflict: "session_id,question_id" });
  }

  // Тақырып бойынша прогресс (жауап берілген сұрақтар ғана)
  const byTopic = new Map<string, { answered: number; correct: number }>();
  for (const q of graded) {
    if (!q.answered) continue;
    const stat = byTopic.get(q.topicId) ?? { answered: 0, correct: 0 };
    stat.answered += 1;
    if (q.correct) stat.correct += 1;
    byTopic.set(q.topicId, stat);
  }
  if (byTopic.size) {
    const { data: existing } = await admin
      .from("student_progress")
      .select("topic_id, answered, correct")
      .eq("user_id", session.user_id)
      .in("topic_id", [...byTopic.keys()]);
    const previous = new Map((existing ?? []).map((p) => [p.topic_id as string, p]));
    await admin.from("student_progress").upsert(
      [...byTopic].map(([topicId, stat]) => ({
        user_id: session.user_id,
        topic_id: topicId,
        answered: (previous.get(topicId)?.answered ?? 0) + stat.answered,
        correct: (previous.get(topicId)?.correct ?? 0) + stat.correct,
        updated_at: new Date().toISOString(),
      })),
    );
  }

  // XP: әр дұрыс жауапқа
  const correctCount = graded.filter((q) => q.correct).length;
  await awardXp(admin, session.user_id, correctCount * XP_PER_CORRECT);
  await grantBadges(admin, session.user_id, examBadges(examType, score, maxScore));
}

/** Жауап жолындағы таңдалған нұсқалар: бір жауаптыда option_id, қалғандарында option_ids */
export function chosenIds(row: { option_id?: unknown; option_ids?: unknown }): string[] {
  if (Array.isArray(row.option_ids)) return row.option_ids as string[];
  return row.option_id ? [row.option_id as string] : [];
}
