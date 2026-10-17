import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

/**
 * ӘКІМШІ клиенті (secret key) — RLS ережелерін айналып өтеді!
 * Тек серверде және тек қажет жерде (демо аккаунттар, тест бағалау) қолданыңыз.
 * Ешқашан "use client" файлына импорттамаңыз.
 */
export function createAdminClient() {
  if (typeof window !== "undefined") {
    throw new Error("createAdminClient тек серверде жұмыс істейді");
  }
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!SUPABASE_URL || !secretKey) return null;

  return createClient(SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
