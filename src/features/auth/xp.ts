import type { SupabaseClient } from "@supabase/supabase-js";
import { grantBadges, progressBadges } from "./badges";

/**
 * XP мен «күн қатарынан» (supabase/migrations/20261103000000_profile_xp.sql → award_xp). ТЕК СЕРВЕРДЕ (admin клиенті).
 * Қате болса (мысалы миграция әлі іске қосылмаған) — тек журналға жазылады: нәтижені сақтау бұзылмауы керек.
 */
export async function awardXp(admin: SupabaseClient, userId: string, amount: number) {
  if (amount <= 0) return;
  const { error } = await admin.rpc("award_xp", { p_user: userId, p_amount: Math.round(amount) });
  if (error?.code === "PGRST202") {
    // shortcut: 20261103000000_profile_xp.sql әлі іске қосылмаған — бұрынғыдай тек XP (атомарлы емес, күн қатарынсыз); миграциядан кейін бұл тармақ іске қосылмайды
    const { data } = await admin.from("profiles").select("xp").eq("id", userId).single<{ xp: number }>();
    if (data) await admin.from("profiles").update({ xp: data.xp + Math.round(amount) }).eq("id", userId);
  } else if (error) {
    console.error("XP қосылмады:", error);
    return;
  }
  // «7 күн қатарынан» және «1000 XP» бейдждері
  const { data: profile } = await admin.from("profiles").select("xp, streak_days").eq("id", userId).maybeSingle<{ xp: number; streak_days: number | null }>();
  if (profile) await grantBadges(admin, userId, progressBadges(profile.xp, profile.streak_days ?? 0));
}

/** ChemLab XP: тек бұрынғы ең жақсы ұпайдан өскені / 10 — бір тәжірибені қайта тапсырып XP жинау мүмкін емес */
export const labXp = (previousBest: number | null, score: number) => Math.max(0, Math.round((score - (previousBest ?? 0)) / 10));
