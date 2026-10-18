import type { SupabaseClient } from "@supabase/supabase-js";

/** Бір пайдаланушыға шектеу (BLUEPRINT 11-бөлім: минутына 10 сұрау) */
export const LIMIT_PER_MINUTE = 10;
export const LIMIT_PER_DAY = 100;

/** Шектен асты ма? Журнал ai_usage кестесінде (тек сервер оқиды) */
export async function isRateLimited(admin: SupabaseClient, userId: string): Promise<boolean> {
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const [minute, day] = await Promise.all([
    admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since(60_000)),
    admin.from("ai_usage").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since(86_400_000)),
  ]);
  if (minute.error || day.error) {
    // Журнал істемесе (мысалы миграция іске қосылмаған) — қауіпсіздік үшін бұғаттаймыз
    console.error("Rate limit тексеру қатесі:", minute.error ?? day.error);
    return true;
  }
  return (minute.count ?? 0) >= LIMIT_PER_MINUTE || (day.count ?? 0) >= LIMIT_PER_DAY;
}

/** Сұрауды журналға жазу (жауап біткенде токен саны жаңартылады) */
export async function logUsage(admin: SupabaseClient, userId: string, route: string) {
  const { data } = await admin.from("ai_usage").insert({ user_id: userId, route }).select("id").single();
  return (data?.id as number | undefined) ?? null;
}

export async function saveTokenUsage(admin: SupabaseClient, usageId: number | null, input?: number, output?: number) {
  if (usageId === null) return;
  await admin.from("ai_usage").update({ input_tokens: input ?? null, output_tokens: output ?? null }).eq("id", usageId);
}
