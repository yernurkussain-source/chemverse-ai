import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Сервердегі Supabase клиенті: пайдаланушының сессиясымен (cookie) жұмыс істейді,
 * сондықтан RLS ережелері сақталады. Server Component, Server Action, Route Handler ішінде қолданылады.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component ішінде cookie жазуға болмайды — сессияны proxy.ts жаңартады
        }
      },
    },
  });
}
