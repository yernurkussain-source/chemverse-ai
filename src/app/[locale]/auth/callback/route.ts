import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Тіркелу хатындағы сілтеме осында келеді: ?code=... → сессия ашылады → onboarding
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/auth/callback">) {
  const { locale: value } = await params;
  const locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const code = request.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(`/${locale}/onboarding`, request.url));
  }
  return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
}
