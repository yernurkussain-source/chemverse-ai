import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { KmzhView } from "@/components/lesson-studio/kmzh-view";
import { LessonPlanView } from "@/components/lesson-studio/lesson-plan-view";
import { PrintButton } from "@/components/qr/print-button";
import { buttonVariants } from "@/components/ui/button";
import { deleteLessonPlan } from "@/features/lesson-studio/actions";
import { kmzhSchema, validateKmzh } from "@/features/lesson-studio/kmzh";
import { lessonPlanSchema } from "@/features/lesson-studio/schema";
import { getTeacherId } from "@/features/teacher/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Жоспар id-і алдын ала белгісіз — бет тек сұраныс кезінде сызылады
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LessonStudio");
  return { title: t("planTitle") };
}

type Params = PageProps<"/[locale]/teacher/lesson-studio/[id]">["params"];

export default function LessonPlanPage({ params }: PageProps<"/[locale]/teacher/lesson-studio/[id]">) {
  const t = useTranslations("LessonStudio");
  return (
    <div className="page-wrap py-8 md:py-12 print:p-0">
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <PlanContent params={params} />
      </Suspense>
    </div>
  );
}

async function PlanContent({ params }: { params: Params }) {
  const { id } = await params;
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const t = await getTranslations("LessonStudio");

  const { userId, isTeacher } = await getTeacherId();
  if (!userId || !isTeacher) {
    redirect({ href: "/teacher", locale });
    return null;
  }

  // RLS: мұғалім тек өз жоспарын оқиды
  const supabase = await createClient();
  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase.from("lesson_plans").select("id, grade, content_json").eq("id", id).maybeSingle(),
    supabase.from("profiles").select("full_name").eq("id", userId).single(),
  ]);
  if (!row) notFound();
  // Жаңа пішім (мектептің ҚМЖ-сы, version 1.0) немесе бұрынғы жоспарлар
  const kmzh = kmzhSchema.safeParse(row.content_json);
  const parsed = kmzh.success ? null : lessonPlanSchema.safeParse(row.content_json);
  if (!kmzh.success && !parsed?.success) notFound();
  const meta = (row.content_json as { meta?: { duration?: number } }).meta;
  const plan = kmzh.success ? { ...kmzh.data, meta: { ...kmzh.data.meta, teacher: profile?.full_name ?? "" } } : null;
  const check = plan ? validateKmzh(plan) : null;
  const minutes = plan?.rows.reduce((sum, r) => sum + (r.minutes ?? 0), 0) ?? 0;
  const points = plan?.rows.reduce((sum, r) => sum + (r.assessment.points ?? 0), 0) ?? 0;

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/teacher/lesson-studio" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("backToStudio")}
        </Link>
        <div className="flex flex-wrap gap-2">
          {plan && (
            // Файл жүктеледі (route handler), сондықтан Link емес
            <a href={`/${locale}/teacher/lesson-studio/${row.id}/docx`} download className={buttonVariants({ variant: "glow", size: "pill-sm" })}>
              ⬇ {t("downloadDocx")}
            </a>
          )}
          <PrintButton label={t("exportPdf")} />
          <form action={deleteLessonPlan}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              className="h-10 rounded-full border border-line px-3.5 text-[0.85rem] font-bold text-muted-foreground hover:border-pink hover:text-pink"
            >
              {t("delete")}
            </button>
          </form>
        </div>
      </div>
      <p className="mb-4 rounded-xl border border-dashed border-line px-3.5 py-2 text-[0.82rem] text-muted-foreground print:hidden">
        {t("pdfHint")}
      </p>
      {plan && check ? (
        <>
          <div className="mb-4 flex flex-col gap-2 print:hidden">
            <p className="rounded-xl border border-amber/50 bg-amber/10 px-3.5 py-2 text-[0.88rem]">{t("kmzhNote")}</p>
            <p className="text-[0.88rem] text-muted-foreground">
              <span className={minutes === plan.meta.lessonMinutes ? "text-good" : "font-semibold text-pink"}>
                {t("timeTotal", { sum: minutes, total: plan.meta.lessonMinutes })}
              </span>
              {" · "}
              {t("pointsTotal", { count: points })}
            </p>
            {[...check.errors.map((e) => ["text-pink", e]), ...check.warnings.map((w) => ["text-amber", w])].map(([color, message]) => (
              <p key={message} className={`text-[0.82rem] ${color}`}>⚠ {message}</p>
            ))}
          </div>
          <KmzhView plan={plan} />
        </>
      ) : (
        parsed?.success && <LessonPlanView plan={parsed.data} grade={row.grade} duration={meta?.duration ?? null} teacherName={profile?.full_name ?? null} />
      )}
    </>
  );
}
