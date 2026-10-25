import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { OpenReviewForm } from "@/components/olympiad/open-review-form";
import { getOpenAnswersForTeacher } from "@/features/olympiad/server/open-answers";
import { getTeacherId } from "@/features/teacher/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.teacher");
  return { title: t("title") };
}

// Мұғалімнің олимпиада беті (OLYMPIAD_SPEC 9-бөлім): ашық жауаптар, сынақ олимпиадалар, сайыс, жобалар
export default function TeacherOlympiadPage() {
  const t = useTranslations("Olympiad.teacher");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/teacher" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("back")}
      </Link>
      <Eyebrow className="mt-5">{t("eyebrow")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-8 max-w-[62ch] text-muted-foreground">{t("subtitle")}</p>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const { userId, isTeacher } = await getTeacherId();
  if (!userId || !isTeacher) {
    redirect({ href: "/teacher", locale });
    return null;
  }
  const [answers, t, tRoot, format] = await Promise.all([
    getOpenAnswersForTeacher(userId),
    getTranslations("Olympiad.teacher.open"),
    getTranslations("Olympiad"),
    getFormatter(),
  ]);

  return (
    <section aria-labelledby="open-answers" className="flex flex-col gap-3">
      <h2 id="open-answers" className="font-display text-xl font-semibold">
        {t("title")}
      </h2>
      <p className="text-[0.9rem] text-muted-foreground">{t("subtitle")}</p>
      {answers.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel-2 px-4 py-3 text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {answers.map((a) => (
            <li key={a.id} className="flex flex-col gap-3 rounded-3xl border border-line bg-panel p-5">
              <p className="flex flex-wrap items-center gap-2 text-[0.8rem] text-muted-foreground">
                <span className="font-semibold text-foreground">{a.studentName ?? t("student")}</span>
                <span>· {format.dateTime(new Date(a.createdAt), { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                {a.problem && (
                  <Link href={`/olympiad/topic/${a.problem.topic}`} className="hover:text-cyan hover:underline">
                    · {tRoot("topicN", { n: a.problem.topic })}
                  </Link>
                )}
                {a.reviewedAt && <span className="rounded-full bg-good/15 px-2 py-0.5 font-semibold text-good">✓ {t("reviewed")}</span>}
              </p>
              {a.problem && <p className="text-[0.92rem] font-semibold">{a.problem.kk}</p>}
              <blockquote className="rounded-2xl border border-line bg-panel-2 px-4 py-3 text-[0.95rem] whitespace-pre-line">{a.answer}</blockquote>
              <p className="text-[0.9rem]">
                <span className="font-mono font-semibold text-cyan">
                  {a.aiScore === null ? t("aiNone") : t("ai", { score: a.aiScore, max: a.maxScore })}
                </span>{" "}
                {a.aiFeedback}
              </p>
              {a.problem && a.problem.rubric.length > 0 && (
                <details className="text-[0.88rem]">
                  <summary className="cursor-pointer font-semibold">{tRoot("problem.rubric")}</summary>
                  <ul className="mt-2 flex list-disc flex-col gap-1 pl-5">
                    {a.problem.rubric.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </details>
              )}
              <OpenReviewForm id={a.id} maxScore={a.maxScore} initialScore={a.teacherScore ?? a.aiScore} initialComment={a.teacherComment} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
