"use server";

import { hasLocale } from "next-intl";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { aiHint, labContext } from "./ai";
import { HINT_STEPS, isShellLab } from "./catalog";

const inputSchema = z.object({
  slug: z.string().max(60),
  step: z.enum(HINT_STEPS),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  locale: z.string().max(5),
  context: z.string().max(4000),
});

export type HintResult = { ok: true; text: string; source: "ai" | "static" } | { ok: false };

/**
 * «Ишара алу» (spec 7-бөлім): 3 деңгей — бағыттаушы сұрақ → нақтырақ кеңес → шешімнің бірінші қадамы.
 * Кірген оқушыға AI жауап береді; AI қолжетімсіз (кірмеген, квота, шектеу) болса — дайын кеңес.
 */
export async function requestLabHint(raw: z.input<typeof inputSchema>): Promise<HintResult> {
  const parsed = inputSchema.safeParse(raw);
  if (!parsed.success || !isShellLab(parsed.data.slug)) return { ok: false };
  const { slug, step, level, context } = parsed.data;
  const locale: Locale = hasLocale(routing.locales, parsed.data.locale) ? parsed.data.locale : routing.defaultLocale;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const text = await aiHint(createAdminClient(), auth.user?.id ?? null, {
    lab: await labContext(slug, locale),
    step,
    level,
    locale,
    context,
  });
  if (text) return { ok: true, text, source: "ai" };

  const t = await getTranslations({ locale, namespace: "ChemLab.hints" });
  return { ok: true, text: t(`${step}.l${level}`), source: "static" };
}
