"use server";

import { refresh } from "next/cache";
import { hasLocale } from "next-intl";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export type TeacherFormState = { error?: "missing_fields" | "invalid_date" | "class_not_found" | "invalid_code" | "unknown"; ok?: boolean } | null;

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

/** Мұғалім жаңа сынып ашады (6 санды код дерекқорда автоматты жасалады) */
export async function createClass(_prev: TeacherFormState, formData: FormData): Promise<TeacherFormState> {
  const name = text(formData, "name").slice(0, 40);
  const grade = Number(text(formData, "grade"));
  if (!name) return { error: "missing_fields" };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_class", { p_name: name, p_grade: grade >= 7 && grade <= 11 ? grade : null });
  if (error) {
    console.error("Сынып ашу қатесі:", error);
    return { error: "unknown" };
  }
  refresh();
  return { ok: true };
}

/**
 * Сыныпқа тапсырма беру (тест + мерзім). RLS: тек сол сыныптың мұғалімі жаза алады.
 * Мерзім — күн соңы, Қазақстан уақыты (UTC+5).
 */
export async function createAssignment(_prev: TeacherFormState, formData: FormData): Promise<TeacherFormState> {
  const classId = text(formData, "classId");
  const examId = text(formData, "examId");
  const title = text(formData, "title").slice(0, 120) || null;
  const due = text(formData, "due");
  if (!classId || !examId) return { error: "missing_fields" };
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return { error: "invalid_date" };

  const supabase = await createClient();
  const { error } = await supabase.from("assignments").insert({
    class_id: classId,
    exam_id: examId,
    title,
    due_at: due ? `${due}T23:59:00+05:00` : null,
  });
  if (error) {
    console.error("Тапсырма беру қатесі:", error);
    return { error: "unknown" };
  }
  refresh();
  return { ok: true };
}

export async function deleteAssignment(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.from("assignments").delete().eq("id", text(formData, "id"));
  if (error) console.error("Тапсырманы жою қатесі:", error);
  refresh();
}

/** Мұғалім оқушыны сыныптан шығарады (RLS: тек өз сыныбынан) */
export async function removeStudent(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("class_members")
    .delete()
    .eq("class_id", text(formData, "classId"))
    .eq("user_id", text(formData, "userId"));
  if (error) console.error("Оқушыны шығару қатесі:", error);
  refresh();
}

/**
 * Сыныпты жою (RLS: тек өз сыныбы). Мүшелік пен тапсырмалар бірге жойылады,
 * оқушылардың тест/зертхана нәтижелері сақталады.
 */
export async function deleteClass(formData: FormData) {
  const localeValue = text(formData, "locale");
  const locale: Locale = hasLocale(routing.locales, localeValue) ? localeValue : routing.defaultLocale;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (auth.user) {
    const { error } = await supabase.from("classes").delete().eq("id", text(formData, "classId")).eq("teacher_id", auth.user.id);
    if (error) console.error("Сыныпты жою қатесі:", error);
  }
  redirect({ href: "/teacher", locale });
}

/** Оқушы 6 санды кодпен сыныпқа қосылады (профиль беті) */
export async function joinClass(_prev: TeacherFormState, formData: FormData): Promise<TeacherFormState> {
  const code = text(formData, "code").replace(/\s/g, "");
  if (!/^\d{6}$/.test(code)) return { error: "invalid_code" };
  const supabase = await createClient();
  const { error } = await supabase.rpc("join_class", { p_code: code });
  if (error) return { error: error.message.includes("class_not_found") ? "class_not_found" : "unknown" };
  refresh();
  return { ok: true };
}
