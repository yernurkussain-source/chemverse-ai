import type { SupabaseClient } from "@supabase/supabase-js";

/** Бейдждер: атаулары мен шарттары — messages → Badges.<id>. Профильде осы ретпен көрсетіледі */
export const BADGES = ["first_test", "first_lab", "unt_80", "lab_master", "streak_7", "xp_1000"] as const;
export type BadgeId = (typeof BADGES)[number];

export const LAB_MASTER_COUNT = 10;
const LAB_MASTER_SCORE = 80;

/** Тест аяқталғанда: алғашқы тест; ҰБТ/ББЖМ-да 80 % және одан жоғары */
export const examBadges = (examType: string, score: number, maxScore: number): BadgeId[] =>
  examType !== "olympiad" && maxScore > 0 && score / maxScore >= 0.8 ? ["first_test", "unt_80"] : ["first_test"];

/** XP қосылғаннан кейін: 7 күн қатарынан, 1000 XP */
export const progressBadges = (xp: number, streakDays: number): BadgeId[] => [
  ...(streakDays >= 7 ? (["streak_7"] as const) : []),
  ...(xp >= 1000 ? (["xp_1000"] as const) : []),
];

/** Бейдж беру (ТЕК СЕРВЕРДЕ): қайталанса ештеңе өзгермейді; қате тек журналға — нәтижені сақтау бұзылмауы керек */
export async function grantBadges(admin: SupabaseClient, userId: string, ids: BadgeId[]) {
  if (!ids.length) return;
  // achievements — сыртқы кілтке арналған анықтама (атаулары messages-те), seed.sql-дегі жазбалар өзгермейді
  await admin.from("achievements").upsert(ids.map((id) => ({ id, title_kk: id })), { onConflict: "id", ignoreDuplicates: true });
  const { error } = await admin
    .from("user_achievements")
    .upsert(ids.map((id) => ({ user_id: userId, achievement_id: id })), { onConflict: "user_id,achievement_id", ignoreDuplicates: true });
  if (error) console.error("Бейдж берілмеді:", error);
}

/** ChemLab жұмысынан кейін: алғашқы тәжірибе; 10 түрлі тәжірибе ≥ 80 ұпаймен — «Зертхана шебері» */
export async function grantLabBadges(admin: SupabaseClient, userId: string) {
  const { data } = await admin.from("lab_attempts").select("experiment_id").eq("user_id", userId).gte("score_total", LAB_MASTER_SCORE);
  const mastered = new Set((data ?? []).map((row) => row.experiment_id as string)).size;
  await grantBadges(admin, userId, mastered >= LAB_MASTER_COUNT ? ["first_lab", "lab_master"] : ["first_lab"]);
}
