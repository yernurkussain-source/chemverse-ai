import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { CreateLiveForm } from "@/components/live/create-live-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTeacherId } from "@/features/teacher/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LiveClass");
  return { title: t("title") };
}

// Live сабақ: мұғалім тест таңдап сессия ашады (BLUEPRINT 10.7)
export default function TeacherLivePage() {
  const t = useTranslations("LiveClass");
  const tTeacher = useTranslations("Teacher");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/teacher" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {tTeacher("title")}
      </Link>
      <Eyebrow className="mt-5">{t("eyebrow")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-8 max-w-[62ch] text-muted-foreground">{t("subtitle")}</p>
      <Suspense fallback={<p className="text-muted-foreground">{tTeacher("loading")}</p>}>
        <LiveContent />
      </Suspense>
    </div>
  );
}

type Localized = Record<string, unknown>;
const pick = (row: Localized, locale: Locale) => (row[`title_${locale}`] as string | null) || (row.title_kk as string);

async function LiveContent() {
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const t = await getTranslations("LiveClass");
  const tTeacher = await getTranslations("Teacher");
  const { userId, isTeacher } = await getTeacherId();
  if (!userId) {
    redirect({ href: "/login", locale });
    return null;
  }
  if (!isTeacher) {
    return (
      <Card className="max-w-xl gap-3 rounded-3xl border border-amber/50 bg-amber/10 p-6 ring-0">
        <p>{tTeacher("teachersOnly")}</p>
        <Link href="/demo" className={`${buttonVariants({ variant: "panel", size: "pill-sm" })} self-start`}>
          {tTeacher("teacherDemo")}
        </Link>
      </Card>
    );
  }

  const supabase = await createClient();
  const [{ data: exams }, { data: sessions }] = await Promise.all([
    supabase.from("exams").select("id, title_kk, title_ru, title_en").order("created_at"),
    supabase
      .from("live_sessions")
      .select("id, code, phase, created_at, question_ids")
      .eq("teacher_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit gap-4 rounded-3xl border border-line p-5 ring-0 shadow-[0_1px_2px_var(--shadow)] sm:p-6 dark:shadow-none">
        <h2 className="font-display text-lg font-semibold">{t("newSession")}</h2>
        <CreateLiveForm exams={(exams ?? []).map((e) => ({ id: e.id as string, title: pick(e, locale) }))} />
      </Card>
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t("recent")}</h2>
        {!sessions?.length ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">{t("noSessions")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {sessions.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/teacher/live/${s.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3 hover:border-cyan-dim"
                >
                  <span className="font-mono text-lg tracking-[0.1em] text-cyan">
                    {String(s.code).slice(0, 3)} {String(s.code).slice(3)}
                  </span>
                  <span className="text-[0.85rem] text-muted-foreground">
                    {t(`phases.${s.phase as "lobby"}`)} · {t("countN", { count: (s.question_ids as string[]).length })} ·{" "}
                    {String(s.created_at).slice(0, 10)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
