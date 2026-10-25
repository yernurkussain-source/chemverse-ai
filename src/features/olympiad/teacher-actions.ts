"use server";

import { randomBytes, randomInt } from "node:crypto";
import { refresh } from "next/cache";
import { hasLocale } from "next-intl";
import { insertLiveSession } from "@/features/live/server";
import type { AssignmentItem, OlympiadAssignment } from "@/features/olympiad/assignments";
import { CONTEST_PER_ROUND, CONTEST_ROUNDS, CONTEST_SECONDS, contestSlug } from "@/features/olympiad/contest";
import { validateProblem } from "@/features/olympiad/bank";
import { balance, econf, GEN } from "@/features/olympiad/core";
import { MOCK_COUNTS, MOCK_DURATIONS, pickMockProblems, type MockConfig } from "@/features/olympiad/mock";
import { CRITERION_MAX, PROJECT_CRITERIA, type ProjectScore } from "@/features/olympiad/projects";
import { isRealDate, LESSON_COUNT, parseHolidays, scheduleLessons, SCHOOL_YEAR_START } from "@/features/olympiad/schedule";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Мұғалімнің олимпиада әрекеттері (OLYMPIAD_SPEC 9-бөлім) */
export type OlympiadTeacherState = { ok?: boolean; error?: "forbidden" | "missing_fields" | "no_problems" | "invalid_holidays" | "unknown" } | null;

/** «Жас химик-дарын» сайысы: таңдалған раундтардан Live сессия (раунд ішінде сұрақтар араласады) */
export async function createContest(_prev: OlympiadTeacherState, formData: FormData): Promise<OlympiadTeacherState> {
  const teacher = await currentTeacher();
  const admin = createAdminClient();
  if (!teacher || !admin) return { error: "forbidden" };
  const value = text(formData, "locale");
  const locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const rounds = CONTEST_ROUNDS.filter((r) => formData.getAll("rounds").includes(r));
  const perRound = Number(text(formData, "perRound"));
  const seconds = Number(text(formData, "seconds"));
  if (!rounds.length || !(CONTEST_PER_ROUND as readonly number[]).includes(perRound) || !(CONTEST_SECONDS as readonly number[]).includes(seconds)) {
    return { error: "missing_fields" };
  }

  const { data: exams } = await admin.from("exams").select("id, slug").in("slug", rounds.map(contestSlug));
  const { data: links } = await admin.from("exam_questions").select("exam_id, question_id").in("exam_id", (exams ?? []).map((e) => e.id));
  const questionIds = rounds.flatMap((round) => {
    const examId = exams?.find((e) => e.slug === contestSlug(round))?.id;
    const ids = (links ?? []).filter((l) => l.exam_id === examId).map((l) => l.question_id as string);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = randomInt(i + 1);
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    return ids.slice(0, perRound);
  });
  // Сұрақтар жоқ — seed:olympiad әлі іске қосылмаған
  if (!questionIds.length) return { error: "no_problems" };

  const sessionId = await insertLiveSession(teacher.supabase, {
    teacher_id: teacher.userId,
    exam_id: null,
    question_ids: questionIds,
    seconds_per_question: seconds,
  });
  if (!sessionId) return { error: "unknown" };
  redirect({ href: `/olympiad/contest/${sessionId}`, locale });
  return null;
}

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

// Экспортталмайды: "use server" файлындағы экспорт клиенттен шақырылатын әрекетке айналады
async function currentTeacher() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  return profile?.role === "teacher" ? { supabase, userId: auth.user.id } : null;
}

/** Ашық жауапқа түпкілікті баға және пікір (AI тек ұсынды — шешімді мұғалім қабылдайды) */
export async function reviewOpenAnswer(_prev: OlympiadTeacherState, formData: FormData): Promise<OlympiadTeacherState> {
  const teacher = await currentTeacher();
  const admin = createAdminClient();
  if (!teacher || !admin) return { error: "forbidden" };
  const id = text(formData, "id");
  const score = Number(text(formData, "score").replace(",", "."));
  const comment = text(formData, "comment").slice(0, 500) || null;

  // RLS: мұғалім тек өз оқушысының жауабын оқи алады
  const { data: row } = await teacher.supabase.from("olympiad_open_answers").select("id, user_id, max_score").eq("id", id).maybeSingle();
  if (!row || row.user_id === teacher.userId) return { error: "forbidden" };
  if (!Number.isFinite(score) || score < 0 || score > Number(row.max_score)) return { error: "missing_fields" };

  const { error } = await admin
    .from("olympiad_open_answers")
    .update({ teacher_score: score, teacher_comment: comment, reviewed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) {
    console.error("Олимпиада: ашық жауап бағасы сақталмады", error);
    return { error: "unknown" };
  }
  refresh();
  return { ok: true };
}

/** Сынақ олимпиада құрастыру: автоматты (әр блоктан 2–3-деңгейлі 2 есеп) не таңдалған тақырыптардан */
export async function createMock(_prev: OlympiadTeacherState, formData: FormData): Promise<OlympiadTeacherState> {
  const teacher = await currentTeacher();
  const admin = createAdminClient();
  if (!teacher || !admin) return { error: "forbidden" };
  const classId = text(formData, "classId");
  const title = text(formData, "title").slice(0, 80);
  const mode = text(formData, "mode") === "topics" ? "topics" : "auto";
  const topics = formData.getAll("topics").map(Number).filter(Number.isInteger);
  const count = Number(text(formData, "count"));
  const duration = Number(text(formData, "duration"));
  const startsAt = text(formData, "startsAt");
  if (
    !classId ||
    !title ||
    !(MOCK_DURATIONS as readonly number[]).includes(duration) ||
    (mode === "topics" && (!topics.length || !(MOCK_COUNTS as readonly number[]).includes(count))) ||
    (startsAt && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(startsAt))
  ) {
    return { error: "missing_fields" };
  }

  const [{ data: problems }, { data: topicRows }] = await Promise.all([
    admin.from("olympiad_problems").select("id, topic, level, type").eq("status", "published").or(`author_id.is.null,author_id.eq.${teacher.userId}`),
    teacher.supabase.from("olympiad_topics").select("n, block"),
  ]);
  const blockOf = new Map((topicRows ?? []).map((t) => [t.n as number, t.block as string]));
  const config: MockConfig = { mode, problems: pickMockProblems(problems ?? [], blockOf, { mode, topics, count }) };
  if (!config.problems.length) return { error: "no_problems" };

  // RLS: тек өз сыныбына (is_class_teacher). Уақыт Қазақстан бойынша (UTC+5)
  const { error } = await teacher.supabase.from("olympiad_mocks").insert({
    class_id: classId,
    title,
    config,
    starts_at: startsAt ? `${startsAt}:00+05:00` : null,
    duration_min: duration,
  });
  if (error) {
    console.error("Олимпиада: сынақ құрастырылмады", error);
    return { error: "forbidden" };
  }
  refresh();
  return { ok: true };
}

/** Ғылыми жобаны рубрика бойынша бағалау (5 критерий × 0–5) — тек сол сыныптың мұғалімі (RLS) */
export async function gradeProject(_prev: OlympiadTeacherState, formData: FormData): Promise<OlympiadTeacherState> {
  const teacher = await currentTeacher();
  const admin = createAdminClient();
  if (!teacher || !admin) return { error: "forbidden" };
  const id = text(formData, "id");
  const values = PROJECT_CRITERIA.map((c) => Number(text(formData, c)));
  if (values.some((v) => !Number.isInteger(v) || v < 0 || v > CRITERION_MAX)) return { error: "missing_fields" };

  const { data: project } = await teacher.supabase.from("olympiad_projects").select("id, user_id").eq("id", id).maybeSingle();
  if (!project || project.user_id === teacher.userId) return { error: "forbidden" };
  const score: ProjectScore = {
    criteria: Object.fromEntries(PROJECT_CRITERIA.map((c, i) => [c, values[i]])) as ProjectScore["criteria"],
    total: values.reduce((a, b) => a + b, 0),
    comment: text(formData, "comment").slice(0, 1000) || null,
    gradedAt: new Date().toISOString(),
  };
  const { error } = await admin.from("olympiad_projects").update({ score, status: "graded" }).eq("id", id);
  if (error) {
    console.error("Олимпиада: жоба бағасы сақталмады", error);
    return { error: "unknown" };
  }
  refresh();
  return { ok: true };
}

/** Күнтізбе: 34 сабақты апта күні бойынша оқу жылына тарату (бар сабақтардың күні жаңартылады — журнал сақталады) */
export async function saveSchedule(_prev: OlympiadTeacherState, formData: FormData): Promise<OlympiadTeacherState> {
  const teacher = await currentTeacher();
  if (!teacher) return { error: "forbidden" };
  const classId = text(formData, "classId");
  const weekday = Number(text(formData, "weekday"));
  const time = text(formData, "time");
  const start = text(formData, "start") || SCHOOL_YEAR_START;
  const holidays = parseHolidays(text(formData, "holidays"));
  if (!classId || !(weekday >= 1 && weekday <= 6) || !/^\d{2}:\d{2}$/.test(time) || !isRealDate(start)) return { error: "missing_fields" };
  if (!holidays) return { error: "invalid_holidays" };

  const dates = scheduleLessons({ start, weekday, holidays });
  // RLS: тек өз сыныбына (is_class_teacher)
  const { error } = await teacher.supabase.from("olympiad_sessions").upsert(
    dates.map((date, i) => ({ class_id: classId, topic: i + 1, date, lesson_time: time })),
    { onConflict: "class_id,topic" },
  );
  if (error) {
    console.error("Олимпиада: күнтізбе сақталмады", error);
    return { error: "forbidden" };
  }
  refresh();
  return { ok: true };
}

/** Күнді қолмен жылжыту: өзгерген сабақтар ғана жаңартылады */
export async function updateSessionDates(_prev: OlympiadTeacherState, formData: FormData): Promise<OlympiadTeacherState> {
  const teacher = await currentTeacher();
  if (!teacher) return { error: "forbidden" };
  const classId = text(formData, "classId");
  const changes = Array.from({ length: LESSON_COUNT }, (_, i) => i + 1)
    .map((topic) => ({ topic, date: text(formData, `date_${topic}`), was: text(formData, `was_${topic}`) }))
    .filter((c) => c.date && c.date !== c.was);
  if (!classId || changes.some((c) => !isRealDate(c.date))) return { error: "missing_fields" };
  for (const c of changes) {
    const { error } = await teacher.supabase.from("olympiad_sessions").update({ date: c.date }).eq("class_id", classId).eq("topic", c.topic);
    if (error) {
      console.error("Олимпиада: сабақ күні сақталмады", error);
      return { error: "unknown" };
    }
  }
  refresh();
  return { ok: true };
}

/** Журнал: сабақтағы қатысу мен үй тапсырмасы (+ үй тапсырмасының мәтіні) */
export async function saveJournal(_prev: OlympiadTeacherState, formData: FormData): Promise<OlympiadTeacherState> {
  const teacher = await currentTeacher();
  if (!teacher) return { error: "forbidden" };
  const sessionId = text(formData, "sessionId");
  const students = formData.getAll("students").map(String);
  // RLS: тек сол сыныптың мұғалімі
  const { error: noteError, data: session } = await teacher.supabase
    .from("olympiad_sessions")
    .update({ note: text(formData, "note").slice(0, 1000) || null })
    .eq("id", sessionId)
    .select("id")
    .maybeSingle();
  if (noteError || !session) return { error: "forbidden" };
  if (students.length) {
    const { error } = await teacher.supabase.from("olympiad_journal").upsert(
      students.map((userId) => ({
        session_id: sessionId,
        user_id: userId,
        present: formData.get(`present_${userId}`) === "on",
        homework: formData.get(`homework_${userId}`) === "on",
      })),
      { onConflict: "session_id,user_id" },
    );
    if (error) {
      console.error("Олимпиада: журнал сақталмады", error);
      return { error: "unknown" };
    }
  }
  refresh();
  return { ok: true };
}

/** Олимпиада тапсырмасы: бүкіл тақырып не таңдалған есептер + генератор есептері бекітілген seed-пен (бәріне бірдей сандар) */
export async function createOlympiadAssignment(_prev: OlympiadTeacherState, formData: FormData): Promise<OlympiadTeacherState> {
  const teacher = await currentTeacher();
  const admin = createAdminClient();
  if (!teacher || !admin) return { error: "forbidden" };
  const classId = text(formData, "classId");
  const topic = Number(text(formData, "topic"));
  const chosen = formData.getAll("problems").map(String);
  const due = text(formData, "due");
  if (!classId || !(Number.isInteger(topic) && topic >= 1 && topic <= 32) || (due && !isRealDate(due))) return { error: "missing_fields" };

  // Ашық есептер кірмейді: оларды мұғалім бағалайды, «орындалды» белгісін код қоя алмайды
  const [{ data: problems }, { data: topicRow }] = await Promise.all([
    admin.from("olympiad_problems").select("id, type").eq("topic", topic).eq("status", "published").or(`author_id.is.null,author_id.eq.${teacher.userId}`).order("id"),
    teacher.supabase.from("olympiad_topics").select("data").eq("n", topic).maybeSingle<{ data: { generators: string[] } }>(),
  ]);
  const pool = (problems ?? []).filter((p) => p.type !== "open").map((p) => p.id as string);
  const items: AssignmentItem[] = [
    ...(text(formData, "mode") === "set" ? pool.filter((id) => chosen.includes(id)) : pool).map((problemId) => ({ problemId })),
    ...(formData.get("generators") === "on" ? (topicRow?.data.generators ?? []) : [])
      .filter((id) => Object.hasOwn(GEN, id))
      .map((generator) => ({ generator, seed: randomInt(1, 2 ** 31) })),
  ];
  if (!items.length) return { error: "no_problems" };

  const olympiad: OlympiadAssignment = { topic, items };
  const { error } = await teacher.supabase.from("assignments").insert({
    class_id: classId,
    title: text(formData, "title").slice(0, 120) || null,
    due_at: due ? `${due}T23:59:00+05:00` : null,
    olympiad,
  });
  if (error) {
    console.error("Олимпиада: тапсырма берілмеді", error);
    return { error: "forbidden" };
  }
  refresh();
  return { ok: true };
}

/** Тақырып теориясы (Markdown + KaTeX) — мұғалімнің өз сыныбына (RLS); бос мәтін — өшіру */
export async function saveTopicTheory(_prev: OlympiadTeacherState, formData: FormData): Promise<OlympiadTeacherState> {
  const teacher = await currentTeacher();
  if (!teacher) return { error: "forbidden" };
  const classId = text(formData, "classId");
  const topic = Number(text(formData, "topic"));
  const theory = text(formData, "theory").slice(0, 8000);
  if (!classId || !(Number.isInteger(topic) && topic >= 1 && topic <= 34)) return { error: "missing_fields" };
  const notes = teacher.supabase.from("olympiad_topic_notes");
  const { error } = theory
    ? await notes.upsert({ class_id: classId, topic, theory, updated_at: new Date().toISOString() }, { onConflict: "class_id,topic" })
    : await notes.delete().eq("class_id", classId).eq("topic", topic);
  if (error) {
    console.error("Олимпиада: теория сақталмады", error);
    return { error: "forbidden" };
  }
  refresh();
  return { ok: true };
}

export type ProblemEditorState = { ok?: boolean; id?: string; reason?: string; error?: "forbidden" | "invalid" | "unknown" } | null;

const lines = (value: string) => value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

/** Есеп редакторы: жариялау алдында тексергіш (теңестіру мен жұпталмаған электрондарды код өзі есептейді) */
export async function createProblem(_prev: ProblemEditorState, formData: FormData): Promise<ProblemEditorState> {
  const teacher = await currentTeacher();
  const admin = createAdminClient();
  if (!teacher || !admin) return { error: "forbidden" };
  const type = text(formData, "type");
  const equation = text(formData, "equation");
  const Z = Number(text(formData, "Z"));
  const safe = <T,>(fn: () => T, fallback: T) => {
    try {
      return fn();
    } catch {
      return fallback;
    }
  };
  const fields: Record<string, unknown> =
    type === "numeric"
      ? { answer: { value: Number(text(formData, "value").replace(",", ".")), unit: text(formData, "unit"), tol: Number(text(formData, "tolPct").replace(",", ".") || "1") / 100 } }
      : type === "mcq"
        ? { choices: formData.getAll("choices").map(String).map((c) => c.trim()).filter(Boolean), correct: Number(text(formData, "correct")) }
        : type === "balance"
          ? { equation, coeffs: safe(() => balance(equation), null) ?? [] }
          : type === "econf"
            ? { Z, unpaired: safe(() => econf(Z).unpaired, -1) }
            : { rubric: lines(text(formData, "rubric")) };
  const check = validateProblem({
    id: `U${randomBytes(4).toString("hex")}`,
    topic: Number(text(formData, "topic")),
    level: Number(text(formData, "level")),
    type,
    kk: text(formData, "kk"),
    solution: lines(text(formData, "solution")),
    hints: [1, 2, 3].map((i) => text(formData, `hint${i}`)),
    ...fields,
  });
  if (!check.ok) return { error: "invalid", reason: check.reason };
  const p = check.problem;
  const { error } = await admin
    .from("olympiad_problems")
    .insert({ id: p.id, topic: p.topic, level: p.level, type: p.type, body: p, author_id: teacher.userId, status: "published" });
  if (error) {
    console.error("Олимпиада: есеп сақталмады", error);
    return { error: "unknown" };
  }
  refresh();
  return { ok: true, id: p.id };
}

/** Өз есебін жасыру / қайта көрсету (банк есептерін ешкім жасыра алмайды) */
export async function toggleProblem(formData: FormData) {
  const teacher = await currentTeacher();
  const admin = createAdminClient();
  if (!teacher || !admin) return;
  const status = text(formData, "status") === "hidden" ? "hidden" : "published";
  await admin.from("olympiad_problems").update({ status }).eq("id", text(formData, "id")).eq("author_id", teacher.userId);
  refresh();
}

export type ImportState = { imported?: number; skipped?: { id: string; reason: string }[]; error?: "forbidden" | "file" } | null;

/** JSON импорт: әр есеп тексергіштен өтеді; мұғалімнің өз есебі болып сақталады (банк id-лері өткізіледі) */
export async function importProblems(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const teacher = await currentTeacher();
  const admin = createAdminClient();
  if (!teacher || !admin) return { error: "forbidden" };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0 || file.size > 1_000_000) return { error: "file" };
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return { error: "file" };
  }
  if (!Array.isArray(raw) || raw.length > 300) return { error: "file" };

  // Біреудің есебін қайта жазбау үшін: id-лер мұғалімнің префиксімен (қайта импорт — өз есебін жаңартады)
  const prefix = `U${teacher.userId.slice(0, 6)}-`;
  const ids = raw.map((p) => String((p as { id?: unknown })?.id ?? ""));
  const { data: existing } = await admin.from("olympiad_problems").select("id, author_id").in("id", [...ids, ...ids.map((id) => prefix + id)]);
  const owner = new Map((existing ?? []).map((r) => [r.id as string, r.author_id as string | null]));
  const skipped: { id: string; reason: string }[] = [];
  const rows: { id: string; topic: number; level: number; type: string; body: unknown; author_id: string; status: string }[] = [];
  raw.forEach((p, i) => {
    const original = ids[i];
    const id = original.startsWith(prefix) ? original : prefix + original;
    const check = validateProblem({ ...(p as object), id });
    if (owner.has(original) && owner.get(original) === null) skipped.push({ id: original, reason: "банкте бар" });
    else if (owner.has(id) && owner.get(id) !== teacher.userId) skipped.push({ id: original, reason: "id бос емес" });
    else if (!check.ok) skipped.push({ id: original, reason: check.reason });
    else rows.push({ id, topic: check.problem.topic, level: check.problem.level, type: check.problem.type, body: check.problem, author_id: teacher.userId, status: "published" });
  });
  if (rows.length) {
    const { error } = await admin.from("olympiad_problems").upsert(rows, { onConflict: "id" });
    if (error) {
      console.error("Олимпиада: импорт сақталмады", error);
      return { error: "file" };
    }
  }
  refresh();
  return { imported: rows.length, skipped: skipped.slice(0, 20) };
}
