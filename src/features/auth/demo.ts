import type { SupabaseClient } from "@supabase/supabase-js";

export type DemoRole = "student" | "teacher";

// Демо аккаунттар (хат жіберілмейді: email бірден расталған болып жасалады)
export const DEMO_ACCOUNTS = {
  student: { email: "student@demo.chemverse.app", fullName: "Айгерім (демо)", grade: 8 },
  teacher: { email: "teacher@demo.chemverse.app", fullName: "Демо мұғалім", grade: 8 },
} as const;

// Демо сыныптың коды басты беттегі Live сабақ кодымен бірдей
const DEMO_CLASS = { name: "8А", grade: 8, joinCode: "482913" };

/** Пайдаланушы жоқ болса жасайды, бар болса құпия сөзін жаңартады; id қайтарады */
async function ensureUser(admin: SupabaseClient, email: string, fullName: string, password: string) {
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (created.data.user) return created.data.user.id;

  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const existing = data.users.find((u) => u.email === email);
  if (!existing) throw created.error ?? new Error(`Демо пайдаланушы табылмады: ${email}`);

  const updated = await admin.auth.admin.updateUserById(existing.id, { password });
  if (updated.error) throw updated.error;
  return existing.id;
}

/**
 * Екі демо аккаунтты (оқушы + мұғалім) және олардың ортақ сыныбын дайындайды.
 * Әкімші клиенті қолданылады, өйткені профильдегі is_demo белгісін пайдаланушы өзі өзгерте алмайды.
 */
export async function ensureDemoAccounts(admin: SupabaseClient, password: string) {
  const studentId = await ensureUser(admin, DEMO_ACCOUNTS.student.email, DEMO_ACCOUNTS.student.fullName, password);
  const teacherId = await ensureUser(admin, DEMO_ACCOUNTS.teacher.email, DEMO_ACCOUNTS.teacher.fullName, password);

  // Әр профиль бөлек сақталады: бір сұраумен бірнеше жол жіберсе, бір жолда жоқ баған
  // (мысалы мұғалімде xp) null болып кетеді де, NOT NULL шектеуі қате береді
  const studentProfile = await admin.from("profiles").upsert({
    id: studentId,
    role: "student",
    full_name: DEMO_ACCOUNTS.student.fullName,
    grade: DEMO_ACCOUNTS.student.grade,
    onboarded: true,
    is_demo: true,
    xp: 1240,
    streak_days: 7,
  });
  if (studentProfile.error) throw studentProfile.error;

  const teacherProfile = await admin.from("profiles").upsert({
    id: teacherId,
    role: "teacher",
    full_name: DEMO_ACCOUNTS.teacher.fullName,
    grade: DEMO_ACCOUNTS.teacher.grade,
    onboarded: true,
    is_demo: true,
  });
  if (teacherProfile.error) throw teacherProfile.error;

  // Мұғалімнің демо сыныбы (бір рет жасалады)
  const existing = await admin.from("classes").select("id").eq("teacher_id", teacherId).limit(1).maybeSingle();
  if (existing.error) throw existing.error;
  let classId = existing.data?.id as string | undefined;
  if (!classId) {
    const inserted = await admin
      .from("classes")
      .insert({ teacher_id: teacherId, name: DEMO_CLASS.name, grade: DEMO_CLASS.grade, join_code: DEMO_CLASS.joinCode })
      .select("id")
      .single();
    if (inserted.error) throw inserted.error;
    classId = inserted.data.id as string;
  }

  const member = await admin
    .from("class_members")
    .upsert({ class_id: classId, user_id: studentId }, { ignoreDuplicates: true });
  if (member.error) throw member.error;

  return {
    student: { id: studentId, email: DEMO_ACCOUNTS.student.email },
    teacher: { id: teacherId, email: DEMO_ACCOUNTS.teacher.email },
  };
}
