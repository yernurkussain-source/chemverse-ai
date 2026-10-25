import { headers } from "next/headers";
import type { Locale } from "@/i18n/routing";

/** Оқушылар ашатын толық адрес (проектордағы QR ішіне жазылады) */
export async function joinUrl(code: string, locale: Locale) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/${locale}/join/${code}`;
}
