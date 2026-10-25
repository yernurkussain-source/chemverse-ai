import { connection } from "next/server";
import type { BankProblem } from "@/features/olympiad/core";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type OpenAnswerRow = {
  id: string;
  userId: string;
  studentName: string | null;
  problem: { id: string; topic: number; kk: string; rubric: string[] } | null;
  answer: string;
  maxScore: number;
  aiScore: number | null;
  aiFeedback: string | null;
  teacherScore: number | null;
  teacherComment: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type Row = {
  id: string;
  user_id: string;
  problem_id: string;
  answer: string;
  max_score: number;
  ai_score: number | null;
  ai_feedback: string | null;
  teacher_score: number | null;
  teacher_comment: string | null;
  reviewed_at: string | null;
  created_at: string;
};

const COLUMNS = "id, user_id, problem_id, answer, max_score, ai_score, ai_feedback, teacher_score, teacher_comment, reviewed_at, created_at";

/** Есеп мәтіні мен рубрикасы (olympiad_problems-ті тек сервер оқиды) */
async function withProblems(rows: Row[], names: Map<string, string | null> = new Map()): Promise<OpenAnswerRow[]> {
  const admin = createAdminClient();
  const ids = [...new Set(rows.map((r) => r.problem_id))];
  const { data } =
    admin && ids.length
      ? await admin.from("olympiad_problems").select("body").in("id", ids).returns<{ body: BankProblem }[]>()
      : { data: [] as { body: BankProblem }[] };
  const problems = new Map((data ?? []).map(({ body }) => [body.id, body]));
  return rows.map((r) => {
    const p = problems.get(r.problem_id);
    return {
      id: r.id,
      userId: r.user_id,
      studentName: names.get(r.user_id) ?? null,
      problem: p ? { id: p.id, topic: p.topic, kk: p.kk, rubric: p.type === "open" ? p.rubric : [] } : null,
      answer: r.answer,
      maxScore: Number(r.max_score),
      aiScore: r.ai_score === null ? null : Number(r.ai_score),
      aiFeedback: r.ai_feedback,
      teacherScore: r.teacher_score === null ? null : Number(r.teacher_score),
      teacherComment: r.teacher_comment,
      reviewedAt: r.reviewed_at,
      createdAt: r.created_at,
    };
  });
}

/** Оқушының өз ашық жауаптары (AI және мұғалім бағасымен), жаңасы бірінші */
export async function getMyOpenAnswers(userId: string, limit = 20): Promise<OpenAnswerRow[]> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("olympiad_open_answers")
    .select(COLUMNS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  return withProblems(data ?? []);
}

/** Мұғалімге: өз оқушыларының ашық жауаптары (RLS: is_my_student), тексерілмегені бірінші */
export async function getOpenAnswersForTeacher(teacherId: string, limit = 40): Promise<OpenAnswerRow[]> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("olympiad_open_answers")
    .select(COLUMNS)
    .neq("user_id", teacherId)
    .order("reviewed_at", { ascending: false, nullsFirst: true })
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<Row[]>();
  const rows = data ?? [];
  const { data: profiles } = rows.length
    ? await supabase.from("profiles").select("id, full_name").in("id", [...new Set(rows.map((r) => r.user_id))])
    : { data: [] as { id: string; full_name: string | null }[] };
  return withProblems(rows, new Map((profiles ?? []).map((p) => [p.id as string, p.full_name as string | null])));
}
