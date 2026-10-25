import { connection } from "next/server";
import { buildRating, type RatingRow } from "@/features/olympiad/rating";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Үйірме рейтингі (OLYMPIAD_SPEC 7-бөлім): тек сынып ішінде. Ұпай — барлық тақырыптағы меңгеру деңгейлерінің қосындысы.
 * Сыныптастардың деректерін RLS жасырады, сондықтан әкімші клиентімен оқылады — оқушыға тек өз орны беріледі.
 */

async function classRating(classId: string): Promise<RatingRow[]> {
  const admin = createAdminClient();
  if (!admin) return [];
  const { data: members } = await admin.from("class_members").select("user_id, profiles(full_name)").eq("class_id", classId).returns<{ user_id: string; profiles: { full_name: string | null } | null }[]>();
  const ids = (members ?? []).map((m) => m.user_id);
  const { data: mastery } = ids.length ? await admin.from("olympiad_mastery").select("user_id, level").in("user_id", ids) : { data: [] };
  return buildRating(
    (members ?? []).map((m) => ({ id: m.user_id, name: m.profiles?.full_name ?? "—" })),
    (mastery ?? []) as { user_id: string; level: number }[],
  );
}

/** Мұғалімге: өз сыныптарының толық кестесі */
export async function getTeacherRatings(classes: { id: string; name: string }[]) {
  await connection();
  return Promise.all(classes.map(async (c) => ({ className: c.name, rows: await classRating(c.id) })));
}

/** Оқушыға: әр сыныбындағы өз орны (басқалардың аты мен ұпайы берілмейді) */
export async function getMyRatings(userId: string) {
  await connection();
  const admin = createAdminClient();
  if (!admin) return [];
  const { data: memberships } = await admin.from("class_members").select("class_id, classes(name)").eq("user_id", userId).returns<{ class_id: string; classes: { name: string } | null }[]>();
  return Promise.all(
    (memberships ?? []).map(async (m) => {
      const rows = await classRating(m.class_id);
      const index = rows.findIndex((r) => r.userId === userId);
      return { className: m.classes?.name ?? "—", rank: index + 1, total: rows.length, points: rows[index]?.points ?? 0, mastered: rows[index]?.mastered ?? 0 };
    }),
  );
}
