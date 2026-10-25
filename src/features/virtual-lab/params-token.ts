import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Тәжірибенің жасырын параметрлері (мысалы HCl концентрациясы) серверде таңдалады және қолтаңбамен
 * клиентке беріледі. Оқушы нәтижені жібергенде сервер қолтаңбаны тексереді — параметрді өзгертіп,
 * «өзіне ыңғайлы» тәжірибе жасауға болмайды. Тек серверде қолданылады.
 *
 * Кілт SUPABASE_SECRET_KEY-ден алынады (бөлек айнымалы қажет емес); ол өзгерсе, ескі токендер жарамсыз болады.
 */
export const TOKEN_TTL_MS = 6 * 60 * 60 * 1000;

/** Қолтаңба кілті. Supabase бапталмаған жергілікті нұсқада нәтиже бәрібір сақталмайды */
export const labSecret = () => process.env.SUPABASE_SECRET_KEY || "chemverse-local-dev";

type Payload = { s: string; p: Record<string, number>; t: number };

function key(secret: string) {
  return createHash("sha256").update(`chemlab:${secret}`).digest();
}

function signature(body: string, secret: string) {
  return createHmac("sha256", key(secret)).update(body).digest("base64url");
}

export function signParams(slug: string, params: Record<string, number>, secret: string, now = Date.now()): string {
  const body = Buffer.from(JSON.stringify({ s: slug, p: params, t: now } satisfies Payload)).toString("base64url");
  return `${body}.${signature(body, secret)}`;
}

/** Дұрыс болса — параметрлер мен басталған уақыт, әйтпесе null (жалған, басқа тәжірибенікі не мерзімі өткен) */
export function verifyParams(
  token: string,
  slug: string,
  secret: string,
  now = Date.now(),
): { params: Record<string, number>; startedAt: number } | null {
  const [body, sig] = token.split(".");
  if (!body || !sig || !secret) return null;
  const expected = Buffer.from(signature(body, secret));
  const actual = Buffer.from(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Payload;
    if (payload.s !== slug || typeof payload.t !== "number" || now - payload.t > TOKEN_TTL_MS || payload.t > now + 60_000) return null;
    return { params: payload.p, startedAt: payload.t };
  } catch {
    return null;
  }
}
