"use server";

import { refresh } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isShellLab } from "./catalog";
import { RUBRIC, type ScoreBreakdown } from "./scoring";

/**
 * Мұғалімнің ChemLab әрекеттері (spec 2-бөлім: /teacher/labs; 6-бөлім: «мұғалім түзете алады»).
 */
export type LabTeacherState = { ok?: boolean; error?: "missing_fields" | "invalid_date" | "migration" | "forbidden" | "unknown" } | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

async function currentTeacher() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
  return profile?.role === "teacher" ? { supabase, userId: auth.user.id } : null;
}

/** Тәжірибені сыныпқа тапсырма ретінде беру (RLS: тек сол сыныптың мұғалімі) */
export async function createLabAssignment(_prev: LabTeacherState, formData: FormData): Promise<LabTeacherState> {
  const teacher = await currentTeacher();
  if (!teacher) return { error: "forbidden" };
  const classId = text(formData, "classId");
  const slug = text(formData, "slug");
  const title = text(formData, "title").slice(0, 120) || null;
  const due = text(formData, "due");
  if (!classId || !isShellLab(slug)) return { error: "missing_fields" };
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "invalid_date" };

  const { error } = await teacher.supabase.from("assignments").insert({
    class_id: classId,
    experiment_id: slug,
    title,
    due_at: due ? `${due}T23:59:00+05:00` : null,
  });
  if (error) {
    console.error("ChemLab тапсырмасын беру қатесі:", error);
    // assignments.experiment_id бағаны жоқ — 3-сессияның миграциясы іске қосылмаған
    return { error: error.code === "PGRST204" || error.code === "42703" ? "migration" : "unknown" };
  }
  refresh();
  return { ok: true };
}

/**
 * Мұғалім оқушы қорытындысының ұпайын (0–25) түзетеді және пікір қалдырады.
 * Тек өз сыныбындағы оқушының жұмысы (RLS арқылы оқылады), өзінікі емес.
 */
export async function overrideConclusion(_prev: LabTeacherState, formData: FormData): Promise<LabTeacherState> {
  const teacher = await currentTeacher();
  const admin = createAdminClient();
  if (!teacher || !admin) return { error: "forbidden" };
  const attemptId = text(formData, "attemptId");
  const score = Number(text(formData, "score"));
  const comment = text(formData, "comment").slice(0, 300);
  if (!Number.isInteger(score) || score < 0 || score > RUBRIC.conclusion) return { error: "missing_fields" };

  // RLS: мұғалім тек өз оқушыларының жұмысын көреді
  const { data: attempt } = await teacher.supabase
    .from("lab_attempts")
    .select("id, user_id, result")
    .eq("id", attemptId)
    .maybeSingle<{ id: string; user_id: string; result: { breakdown?: ScoreBreakdown } }>();
  const breakdown = attempt?.result.breakdown;
  if (!attempt || attempt.user_id === teacher.userId || !breakdown) return { error: "forbidden" };

  const { error } = await admin
    .from("lab_attempts")
    .update({
      teacher_override: { conclusion: score, comment: comment || null, by: teacher.userId, at: new Date().toISOString() },
      score_total: breakdown.total - breakdown.conclusion + score,
    })
    .eq("id", attempt.id);
  if (error) {
    console.error("Мұғалім бағасын сақтау қатесі:", error);
    return { error: "unknown" };
  }
  refresh();
  return { ok: true };
}
