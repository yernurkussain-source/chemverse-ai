import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { VirtualTitration } from "@/components/lab/virtual-titration";
import type { TitrationGrade } from "@/features/lab/actions";
import { routing, type Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("VirtualLab");
  return { title: t("title") };
}

// Виртуалды зертхана: титрлеу (BLUEPRINT 10.6)
export default function TitrationLabPage() {
  const t = useTranslations("VirtualLab");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-6 max-w-[62ch] text-muted-foreground">{t("subtitle")}</p>
      <VirtualTitration />
      <Suspense fallback={null}>
        <AttemptHistory />
      </Suspense>
    </div>
  );
}

type Attempt = {
  id: string;
  created_at: string;
  result: { answerErrorPct?: number; grade?: TitrationGrade; trueConcentration?: number };
};

const GRADE_COLOR: Record<TitrationGrade, string> = { excellent: "text-good", good: "text-cyan", retry: "text-amber" };

/** Оқушының соңғы 5 әрекеті (RLS: тек өзінікі) */
async function AttemptHistory() {
  await connection();
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const t = await getTranslations("VirtualLab");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data } = await supabase
    .from("lab_attempts")
    .select("id, created_at, result")
    .eq("user_id", auth.user.id)
    .eq("experiment_id", "titration")
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Attempt[]>();
  if (!data?.length) return null;

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-display text-lg font-semibold">{t("history")}</h2>
      <ul className="flex flex-col gap-2">
        {data.map((attempt) => {
          const grade = attempt.result.grade ?? "retry";
          return (
            <li key={attempt.id} className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3 text-[0.9rem]">
              <span className="font-mono text-muted-foreground">{attempt.created_at.slice(0, 10)}</span>
              <span className={cn("font-semibold", GRADE_COLOR[grade])}>{t(`gradeShort.${grade}`)}</span>
              <span className="font-mono">
                {t("errorShort", { value: formatDecimal(attempt.result.answerErrorPct ?? 0, locale, 1) })}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
