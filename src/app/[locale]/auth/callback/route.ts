import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/**
 * Тіркелу хатындағы, құпия сөзді қалпына келтіру хатындағы сілтеме және Google арқылы кіру осында қайтады: ?code=... → сессия ашылады.
 * Профилін толтырған пайдаланушы — профильге, жаңасы — onboarding-ке.
 * Қате болса (мысалы Google терезесінде «Болдырмау» басылса) — кіру бетіне, қате хабарымен.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/auth/callback">) {
  const { locale: value } = await params;
  const locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const go = (path: string) => NextResponse.redirect(new URL(`/${locale}${path}`, request.url));
  const code = request.nextUrl.searchParams.get("code");
  // «Құпия сөзді ұмыттым» хатынан келсе — жаңа құпия сөз бетіне (сілтеме ескірсе, бет өзі хабарлайды)
  const reset = request.nextUrl.searchParams.get("next") === "reset";

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      if (reset) return go("/reset-password");
      const { data: profile } = await supabase.from("profiles").select("onboarded").eq("id", data.user.id).maybeSingle();
      return go(profile?.onboarded ? "/profile" : "/onboarding");
    }
    console.error("Кіру сілтемесі қатесі:", error);
  }
  return go(reset ? "/reset-password" : "/login?error=oauth_failed");
}
