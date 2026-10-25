"use server";

import { randomInt } from "node:crypto";
import { refresh } from "next/cache";
import { hasLocale } from "next-intl";
import { insertLiveSession } from "@/features/live/server";
import { CONTEST_PER_ROUND, CONTEST_ROUNDS, CONTEST_SECONDS, contestSlug } from "@/features/olympiad/contest";
import { MOCK_COUNTS, MOCK_DURATIONS, pickMockProblems, type MockConfig } from "@/features/olympiad/mock";
import { CRITERION_MAX, PROJECT_CRITERIA, type ProjectScore } from "@/features/olympiad/projects";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Мұғалімнің олимпиада әрекеттері (OLYMPIAD_SPEC 9-бөлім) */
export type OlympiadTeacherState = { ok?: boolean; error?: "forbidden" | "missing_fields" | "no_problems" | "unknown" } | null;

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
    admin.from("olympiad_problems").select("id, topic, level, type").eq("status", "published"),
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
