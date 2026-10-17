import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  role: "student" | "teacher" | "guest";
  full_name: string | null;
  school: string | null;
  grade: number | null;
  onboarded: boolean;
  is_demo: boolean;
  xp: number;
  streak_days: number;
};

export type ClassInfo = { id: string; name: string; grade: number | null; join_code: string };

/** Кірген пайдаланушы, оның профилі және сыныптары (кірмеген болса — null) */
export async function getCurrentAccount() {
  // Бұл деректер әр сұраныста жаңадан оқылады. Next-ке нақты айтамыз: әйтпесе Supabase ішіндегі
  // Date.now() (сессия мерзімін тексеру) алдын ала сызу кезінде «тұрақсыз мән» қатесін береді.
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, role, full_name, school, grade, onboarded, is_demo, xp, streak_days")
    .eq("id", auth.user.id)
    .single<Profile>();

  let classes: ClassInfo[] = [];
  if (profile?.role === "teacher") {
    const { data } = await supabase
      .from("classes")
      .select("id, name, grade, join_code")
      .eq("teacher_id", auth.user.id)
      .order("created_at");
    classes = data ?? [];
  } else if (profile) {
    const { data } = await supabase
      .from("class_members")
      .select("classes(id, name, grade, join_code)")
      .eq("user_id", auth.user.id)
      .returns<{ classes: ClassInfo | null }[]>();
    classes = (data ?? []).flatMap((row) => (row.classes ? [row.classes] : []));
  }

  return { user: auth.user, profile, classes };
}
