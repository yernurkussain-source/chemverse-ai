import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { StudioForm } from "@/components/lesson-studio/studio-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getTeacherId } from "@/features/teacher/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// AI жоспар құруға 20–40 секунд кетуі мүмкін (server action осы беттің шегін қолданады)
export const maxDuration = 60;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LessonStudio");
  return { title: t("title") };
}

// AI Lesson Studio: ҚМЖ генераторы (BLUEPRINT 10.8)
export default function LessonStudioPage() {
  const t = useTranslations("LessonStudio");
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
        <StudioContent />
      </Suspense>
    </div>
  );
}

async function StudioContent() {
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const t = await getTranslations("LessonStudio");
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
  const { data: plans } = await supabase
    .from("lesson_plans")
    .select("id, topic, grade, created_at")
    .eq("teacher_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit gap-4 rounded-3xl border border-line p-5 ring-0 shadow-[0_1px_2px_var(--shadow)] sm:p-6 dark:shadow-none">
        <h2 className="font-display text-lg font-semibold">{t("newPlan")}</h2>
        <StudioForm />
      </Card>
      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">{t("myPlans")}</h2>
        {!plans?.length ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">{t("noPlans")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {plans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/teacher/lesson-studio/${p.id}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3 hover:border-cyan-dim"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">{p.topic}</span>
                    <span className="text-[0.8rem] text-muted-foreground">
                      {p.grade ? tTeacher("gradeN", { n: p.grade }) : ""} · {String(p.created_at).slice(0, 10)}
                    </span>
                  </span>
                  <span className="shrink-0 text-cyan">→</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
