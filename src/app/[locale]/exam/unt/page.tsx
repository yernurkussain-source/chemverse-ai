import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { SubmitButton } from "@/components/auth/form-parts";
import { Eyebrow } from "@/components/landing/section";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { startExam } from "@/features/exam/actions";
import { getExamOverview, getRecentSessions } from "@/features/exam/queries";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { BackLink } from "@/components/layout/back-link";

const EXAM_SLUG = "unt-demo";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Exam");
  return { title: t("untTitle") };
}

// ҰБТ режимі: тест туралы ақпарат және «Бастау»
export default function UntPage() {
  const t = useTranslations("Exam");
  return (
    <div className="page-wrap py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <BackLink href="/learn" />
        <Eyebrow>UNT Master</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("untTitle")}</h1>
        <p className="mt-2 mb-8 text-muted-foreground">{t("untSubtitle")}</p>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <UntContent />
        </Suspense>
      </div>
    </div>
  );
}

async function currentLocale(): Promise<Locale> {
  const value = await rootLocale();
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

async function UntContent() {
  const locale = await currentLocale();
  const t = await getTranslations("Exam");
  const exam = await getExamOverview(EXAM_SLUG, locale);
  if (!exam) {
    return <p className="rounded-2xl border border-amber/50 bg-amber/10 p-4">{t("notSeeded")}</p>;
  }
  const recent = await getRecentSessions(exam.id);

  return (
    <div className="flex flex-col gap-6">
      <Card className="gap-5 rounded-3xl border border-line p-6 ring-0 shadow-[0_1px_2px_var(--shadow)] sm:p-8 dark:shadow-none">
        <dl className="m-0 grid grid-cols-2 gap-2.5">
          <Stat label={t("questions")} value={String(exam.questionCount)} />
          <Stat label={t("duration")} value={t("minutes", { count: exam.durationMinutes })} />
        </dl>
        <div>
          <h2 className="mb-2 text-[0.9rem] font-semibold">{t("topics")}</h2>
          <ul className="flex flex-wrap gap-1.5">
            {exam.topics.map((topic) => (
              <li key={topic} className="rounded-full border border-line bg-panel-2 px-3 py-1 text-[0.82rem]">
                {topic}
              </li>
            ))}
          </ul>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-[0.88rem] text-muted-foreground">
          <li>{t("rules.timer")}</li>
          <li>{t("rules.saved")}</li>
          <li>{t("rules.server")}</li>
        </ul>

        {recent === null ? (
          <div className="flex flex-col gap-3 rounded-2xl border border-cyan-dim/60 bg-cyan/5 p-4">
            <p className="text-[0.92rem]">{t("loginToStart")}</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/demo" className={buttonVariants({ variant: "glow", size: "pill-sm" })}>
                {t("demoStart")}
              </Link>
              <Link href="/login" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
                {t("login")}
              </Link>
            </div>
          </div>
        ) : (
          <form action={startExam}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="slug" value={exam.slug} />
            <SubmitButton>{recent.some((s) => s.status === "in_progress") ? t("continue") : t("start")}</SubmitButton>
          </form>
        )}
      </Card>

      {recent && recent.some((s) => s.status !== "in_progress") && (
        <section>
          <h2 className="mb-3 font-display text-lg font-semibold">{t("recent")}</h2>
          <ul className="flex flex-col gap-2">
            {recent
              .filter((s) => s.status !== "in_progress")
              .map((s) => {
                const percent = s.max_score ? Math.round(((s.score ?? 0) / s.max_score) * 100) : 0;
                return (
                  <li key={s.id}>
                    <Link
                      href={`/exam/result/${s.id}`}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3 hover:border-cyan-dim"
                    >
                      <span className="font-mono text-[0.85rem] text-muted-foreground">{s.started_at.slice(0, 10)}</span>
                      <span className={cn("font-mono font-semibold", percent >= 60 ? "text-good" : "text-amber")}>
                        {s.score}/{s.max_score} · {percent}%
                      </span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </section>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-2 p-3.5">
      <dt className="text-[0.78rem] text-muted-foreground">{label}</dt>
      <dd className="m-0 mt-1 font-mono text-xl font-semibold text-cyan">{value}</dd>
    </div>
  );
}
