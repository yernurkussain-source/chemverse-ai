import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { isSupabaseConfigured, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./lib/supabase/env";

// Next.js 16: бұрынғы middleware.ts енді proxy.ts деп аталады
const handleI18n = createMiddleware(routing);

// Тек кірген пайдаланушыға арналған беттер
const PROTECTED = ["/onboarding", "/profile", "/teacher", "/exam/session", "/exam/result"];
// Кірген пайдаланушыға қажет емес беттер
const GUEST_ONLY = ["/login", "/register"];

const matches = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(`${p}/`));

export default async function proxy(request: NextRequest) {
  // 1) Тіл: "/" → "/kk" т.б.
  const response = handleI18n(request);
  if (response.headers.has("location") || !isSupabaseConfigured) return response;

  // 2) Supabase: сессияны тексеріп, мерзімі өтсе жаңартамыз (жаңа cookie жауапқа жазылады)
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims?.sub);

  // Сессия жабылған/ескірген (мысалы refresh_token_not_found) — ескі cookie-лерді өшіреміз,
  // әйтпесе әр сұраныста қайта жаңартуға тырысып, қате бере береді
  if (error && !isLoggedIn) {
    request.cookies
      .getAll()
      .filter(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"))
      .forEach(({ name }) => response.cookies.delete(name));
  }

  // 3) Жабық беттер: "/kk/profile" → тіл "kk", жол "/profile"
  const [, locale, ...rest] = request.nextUrl.pathname.split("/");
  const path = `/${rest.join("/")}`;
  const redirectTo = (target: string) => {
    const redirect = NextResponse.redirect(new URL(`/${locale}${target}`, request.url));
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!isLoggedIn && matches(path, PROTECTED)) return redirectTo("/login");
  if (isLoggedIn && matches(path, GUEST_ONLY)) return redirectTo("/profile");

  return response;
}

export const config = {
  // api, _next, _vercel және нүктесі бар файлдардан (favicon.ico т.б.) басқа барлық жол
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
