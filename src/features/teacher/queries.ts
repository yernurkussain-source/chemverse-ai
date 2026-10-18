import { connection } from "next/server";
import type { Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/**
 * Мұғалім кабинетінің деректері. Барлығы пайдаланушының өз сессиясымен оқылады:
 * RLS мұғалімге тек өз сыныптарын және өз оқушыларының нәтижелерін көрсетеді.
 */

type Localized = Record<string, unknown>;
const pick = (row: Localized, field: string, locale: Locale) =>
  (row[`${field}_${locale}`] as string | null) || (row[`${field}_kk`] as string | null) || "";

/** Кірген мұғалімнің id-і (мұғалім болмаса — null) */
export async function getTeacherId() {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return { userId: null, isTeacher: false };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  return { userId: auth.user.id, isTeacher: profile?.role === "teacher" };
}

export type TeacherClass = { id: string; name: string; grade: number | null; join_code: string; students: number };

export async function getTeacherClasses(teacherId: string): Promise<TeacherClass[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("classes")
    .select("id, name, grade, join_code, class_members(count)")
    .eq("teacher_id", teacherId)
    .order("created_at")
    .returns<(Omit<TeacherClass, "students"> & { class_members: { count: number }[] })[]>();
  return (data ?? []).map(({ class_members, ...c }) => ({ ...c, students: class_members[0]?.count ?? 0 }));
}

export type StudentRow = {
  id: string;
  name: string;
  xp: number;
  exams: number;
  lastExamPct: number | null;
  avgExamPct: number | null;
  labs: number;
  bestLabErrorPct: number | null;
};

export type AssignmentRow = {
  id: string;
  title: string;
  examTitle: string;
  dueAt: string | null;
  createdAt: string;
  done: number;
};

export type ClassDetail = {
  id: string;
  name: string;
  grade: number | null;
  joinCode: string;
  students: StudentRow[];
  assignments: AssignmentRow[];
  exams: { id: string; title: string }[];
};

const percent = (score: number | null, max: number | null) => (max ? Math.round(((score ?? 0) / max) * 100) : 0);

/** Сынып беті: оқушылар, олардың тест/зертхана нәтижелері, тапсырмалар */
export async function getClassDetail(classId: string, teacherId: string, locale: Locale): Promise<ClassDetail | null> {
  const supabase = await createClient();
  const { data: cls } = await supabase
    .from("classes")
    .select("id, name, grade, join_code, teacher_id")
    .eq("id", classId)
    .maybeSingle();
  if (!cls || cls.teacher_id !== teacherId) return null;

  const [{ data: members }, { data: assignments }, { data: exams }] = await Promise.all([
    supabase
      .from("class_members")
      .select("user_id, joined_at, profiles(full_name, xp)")
      .eq("class_id", classId)
      .returns<{ user_id: string; joined_at: string; profiles: { full_name: string | null; xp: number } | null }[]>(),
    supabase
      .from("assignments")
      .select("id, title, exam_id, due_at, created_at, exams(title_kk, title_ru, title_en)")
      .eq("class_id", classId)
      .order("created_at", { ascending: false })
      .returns<{ id: string; title: string | null; exam_id: string | null; due_at: string | null; created_at: string; exams: Localized | null }[]>(),
    supabase.from("exams").select("id, title_kk, title_ru, title_en").order("created_at"),
  ]);

  const studentIds = (members ?? []).map((m) => m.user_id);
  const [{ data: sessions }, { data: labs }] = studentIds.length
    ? await Promise.all([
        supabase
          .from("exam_sessions")
          .select("user_id, exam_id, score, max_score, finished_at")
          .in("user_id", studentIds)
          .neq("status", "in_progress")
          .order("finished_at", { ascending: false }),
        supabase.from("lab_attempts").select("user_id, result").in("user_id", studentIds),
      ])
    : [{ data: [] }, { data: [] }];

  const students: StudentRow[] = (members ?? []).map((m) => {
    const own = (sessions ?? []).filter((s) => s.user_id === m.user_id);
    const pcts = own.map((s) => percent(s.score, s.max_score));
    const ownLabs = (labs ?? []).filter((l) => l.user_id === m.user_id);
    const labErrors = ownLabs
      .map((l) => (l.result as { answerErrorPct?: number }).answerErrorPct)
      .filter((v): v is number => typeof v === "number");
    return {
      id: m.user_id,
      name: m.profiles?.full_name || "—",
      xp: m.profiles?.xp ?? 0,
      exams: own.length,
      lastExamPct: pcts[0] ?? null,
      avgExamPct: pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null,
      labs: ownLabs.length,
      bestLabErrorPct: labErrors.length ? Math.min(...labErrors) : null,
    };
  });
  students.sort((a, b) => a.name.localeCompare(b.name, locale));

  // Тапсырма орындалды: тапсырма берілгеннен кейін сол тест аяқталған
  const assignmentRows: AssignmentRow[] = (assignments ?? []).map((a) => {
    const done = new Set(
      (sessions ?? [])
        .filter((s) => s.exam_id === a.exam_id && s.finished_at && s.finished_at >= a.created_at)
        .map((s) => s.user_id),
    );
    return {
      id: a.id,
      title: a.title || (a.exams ? pick(a.exams, "title", locale) : ""),
      examTitle: a.exams ? pick(a.exams, "title", locale) : "",
      dueAt: a.due_at,
      createdAt: a.created_at,
      done: done.size,
    };
  });

  return {
    id: cls.id,
    name: cls.name,
    grade: cls.grade,
    joinCode: cls.join_code,
    students,
    assignments: assignmentRows,
    exams: (exams ?? []).map((e) => ({ id: e.id as string, title: pick(e, "title", locale) })),
  };
}

export type StudentAssignment = {
  id: string;
  title: string;
  className: string;
  dueAt: string | null;
  done: boolean;
  overdue: boolean;
};

/** Оқушының тапсырмалары (профиль беті үшін) */
export async function getStudentAssignments(userId: string, locale: Locale): Promise<StudentAssignment[]> {
  await connection();
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, exam_id, due_at, created_at, classes(name), exams(title_kk, title_ru, title_en)")
    .order("created_at", { ascending: false })
    .limit(10)
    .returns<{
      id: string;
      title: string | null;
      exam_id: string | null;
      due_at: string | null;
      created_at: string;
      classes: { name: string } | null;
      exams: Localized | null;
    }[]>();
  if (!assignments?.length) return [];

  const { data: sessions } = await supabase
    .from("exam_sessions")
    .select("exam_id, finished_at")
    .eq("user_id", userId)
    .neq("status", "in_progress");

  const now = Date.now();
  return assignments.map((a) => {
    const done = (sessions ?? []).some((s) => s.exam_id === a.exam_id && s.finished_at && s.finished_at >= a.created_at);
    return {
      id: a.id,
      title: a.title || (a.exams ? pick(a.exams, "title", locale) : ""),
      className: a.classes?.name ?? "",
      dueAt: a.due_at,
      done,
      overdue: !done && Boolean(a.due_at && Date.parse(a.due_at) < now),
    };
  });
}
