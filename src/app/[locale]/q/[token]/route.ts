import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { isQrType, qrDestination, TOKEN_PATTERN } from "@/features/qr/types";
import { routing } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * QR → /q/[token]: сервер токенді тексереді (бар ма, қосулы ма, мерзімі өтпеген бе),
 * сканерлеуді статистикаға жазады және керекті бетке жібереді (BLUEPRINT 6-бөлім).
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/[locale]/q/[token]">) {
  const { locale: rawLocale, token } = await params;
  const locale = hasLocale(routing.locales, rawLocale) ? rawLocale : routing.defaultLocale;
  const go = (path: string) => NextResponse.redirect(new URL(`/${locale}${path}`, request.url));

  const admin = createAdminClient();
  if (!admin || !TOKEN_PATTERN.test(token)) return go("/q/invalid");

  const { data: qr } = await admin
    .from("qr_resources")
    .select("id, type, target, is_active, expires_at, scan_count")
    .eq("token", token)
    .maybeSingle();

  const expired = qr?.expires_at && new Date(qr.expires_at).getTime() < Date.now();
  if (!qr || !qr.is_active || expired || !isQrType(qr.type)) return go("/q/invalid");

  // Кім сканерледі (кірген болса) және қандай құрылғы — тек статистика үшін
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const userAgent = request.headers.get("user-agent") ?? "";
  const device = /android|iphone|ipad|mobile/i.test(userAgent) ? "mobile" : "desktop";

  // Санауыш: бір мезгілде екі сканерлеу болса біреуі жоғалуы мүмкін — статистика үшін бұл маңызды емес
  await Promise.all([
    admin.from("qr_resources").update({ scan_count: qr.scan_count + 1 }).eq("id", qr.id),
    admin.from("qr_scans").insert({ qr_id: qr.id, user_id: auth.user?.id ?? null, device }),
  ]);

  return go(qrDestination(qr.type, qr.target));
}
