import type { SupabaseClient } from "@supabase/supabase-js";
import type { Locale } from "@/i18n/routing";

/**
 * Демо жауаптар кэші (ai_cache кестесі). Сұрақ «қалыпқа келтіріледі»:
 * кіші әріп, индекстер кәдімгі сан (H₂O → h2o), тыныс белгілері мен артық бос орын жоқ.
 * Сонда «H₂SO₄-тің молярлық массасы?» мен «h2so4-тің молярлық массасы» бір кілт болады.
 */
export function questionKey(question: string): string {
  return question
    .toLowerCase()
    .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080))
    .replace(/[⁺]/g, "+")
    .replace(/[⁻]/g, "-")
    .replace(/[^\p{L}\p{N}+\-=]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export type CachedAnswer = { answer: string; sources: { title: string }[] };

export async function findCachedAnswer(admin: SupabaseClient, question: string, locale: Locale): Promise<CachedAnswer | null> {
  const { data, error } = await admin
    .from("ai_cache")
    .select("answer, sources")
    .eq("question_key", questionKey(question))
    .eq("locale", locale)
    .maybeSingle();
  // Кесте жоқ болса (миграция іске қосылмаса) — жай ғана AI-ға жібереміз
  if (error || !data) return null;
  return { answer: data.answer as string, sources: (data.sources as { title: string }[]) ?? [] };
}
