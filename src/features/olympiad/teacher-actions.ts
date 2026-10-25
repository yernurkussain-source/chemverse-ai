"use server";

import { refresh } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Мұғалімнің олимпиада әрекеттері (OLYMPIAD_SPEC 9-бөлім) */
export type OlympiadTeacherState = { ok?: boolean; error?: "forbidden" | "missing_fields" | "unknown" } | null;

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
