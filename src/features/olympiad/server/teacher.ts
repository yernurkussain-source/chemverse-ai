import { connection } from "next/server";
import { isAssignmentDone, type OlympiadAssignment } from "@/features/olympiad/assignments";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Мұғалім құралдарының деректері — бәрі мұғалімнің өз сессиясымен (RLS: тек өз сыныптары мен оқушылары) */
export type SessionRow = { id: string; class_id: string; topic: number; date: string; lesson_time: string | null; note: string | null };
export type Student = { id: string; name: string };

/** Сыныптың 34 сабағы (күнтізбе) */
export async function getClassSessions(classId: string): Promise<SessionRow[]> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("olympiad_sessions")
    .select("id, class_id, topic, date, lesson_time, note")
    .eq("class_id", classId)
    .order("topic")
    .returns<SessionRow[]>();
  return data ?? [];
}

/** Сынып оқушылары (аты бойынша) */
export async function getClassStudents(classId: string): Promise<Student[]> {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_members")
    .select("user_id, profiles(full_name)")
    .eq("class_id", classId)
    .returns<{ user_id: string; profiles: { full_name: string | null } | null }[]>();
  return (data ?? []).map((m) => ({ id: m.user_id, name: m.profiles?.full_name ?? "—" })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Бір сабақтың журналы: сабақ, оқушылар, белгілер */
export async function getJournal(sessionId: string) {
  await connection();
  const supabase = await createClient();
  const { data: session } = await supabase
    .from("olympiad_sessions")
    .select("id, class_id, topic, date, lesson_time, note")
    .eq("id", sessionId)
    .maybeSingle<SessionRow>();
  if (!session) return null;
  const [students, { data: rows }] = await Promise.all([
    getClassStudents(session.class_id),
    supabase.from("olympiad_journal").select("user_id, present, homework").eq("session_id", sessionId),
  ]);
  return { session, students, marks: new Map((rows ?? []).map((r) => [r.user_id as string, { present: r.present as boolean, homework: r.homework as boolean }])) };
}

/** Меңгеру картасы: оқушы × тақырып (RLS: is_my_student) */
export async function getHeatmap(classId: string) {
  const students = await getClassStudents(classId);
  const supabase = await createClient();
  const { data } = students.length
    ? await supabase.from("olympiad_mastery").select("user_id, topic, level").in("user_id", students.map((s) => s.id))
    : { data: [] };
  const levels = new Map<string, number>();
  for (const r of data ?? []) levels.set(`${r.user_id}:${r.topic}`, Number(r.level));
  return { students, level: (userId: string, topic: number) => levels.get(`${userId}:${topic}`) ?? null };
}

/** Тапсырма формасына: мұғалім бере алатын есептер (банк + өз есептері, ашық есептерсіз), қысқа шартымен */
export async function getAssignableProblems(teacherId: string) {
  await connection();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data } = await admin
    .from("olympiad_problems")
    .select("id, topic, level, type, body")
    .eq("status", "published")
    .neq("type", "open")
    .or(`author_id.is.null,author_id.eq.${teacherId}`)
    .order("id")
    .returns<{ id: string; topic: number; level: number; type: string; body: { kk: string } }[]>();
  return (data ?? []).map(({ id, topic, level, type, body }) => ({ id, topic, level, type, kk: body.kk.slice(0, 110) }));
}

/** Сыныптың олимпиада тапсырмалары және әрқайсысын неше оқушы орындағаны */
export async function getClassAssignments(classId: string, studentIds: string[]) {
  await connection();
  const supabase = await createClient();
  const { data: assignments } = await supabase
    .from("assignments")
    .select("id, title, due_at, created_at, olympiad")
    .eq("class_id", classId)
    .not("olympiad", "is", null)
    .order("created_at", { ascending: false })
    .returns<{ id: string; title: string | null; due_at: string | null; created_at: string; olympiad: OlympiadAssignment }[]>();
  const list = assignments ?? [];
  const since = list.at(-1)?.created_at;
  // shortcut: Supabase бір сұраныста 1000 жолға дейін береді — сынып үлкен болса, тапсырма бойынша бөліп сұрау
  const { data: attempts } =
    since && studentIds.length
      ? await supabase.from("olympiad_attempts").select("user_id, problem_id, seed, correct, created_at").in("user_id", studentIds).eq("correct", true).gte("created_at", since)
      : { data: [] as { user_id: string; problem_id: string; seed: number | null; correct: boolean; created_at: string }[] };
  return list.map((a) => ({
    ...a,
    done: studentIds.filter((id) => isAssignmentDone(a.olympiad.items, (attempts ?? []).filter((x) => x.user_id === id), a.created_at)).length,
  }));
}
