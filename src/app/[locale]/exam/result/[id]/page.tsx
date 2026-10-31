import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ReviewList } from "@/components/exam/review-list";
import { getResultView, type ResultView } from "@/features/exam/queries";
import { EXAM_PAGE } from "@/features/exam/scoring";
import { WEAK_TOPIC_THRESHOLD } from "@/features/exam/scoring";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";
import { BackLink } from "@/components/layout/back-link";

// Сессия id-і алдын ала белгісіз (әр тестте жаңа) — бет тек сұраныс кезінде сызылады
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Exam");
  return { title: t("resultTitle") };
}

type Params = PageProps<"/[locale]/exam/result/[id]">["params"];

// Тест нәтижесі: балл, тақырып бойынша әлсіз жерлер, сұрақтарды талдау
export default function ExamResultPage({ params }: PageProps<"/[locale]/exam/result/[id]">) {
  const t = useTranslations("Exam");
  return (
    <div className="page-wrap py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <ResultContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

/** Сессияның ұзақтығы: "24:05" (мин:сек) */
function duration(session: ResultView["session"]) {
  if (!session.finished_at) return "—";
  const seconds = Math.max(0, Math.round((Date.parse(session.finished_at) - Date.parse(session.started_at)) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

async function ResultContent({ params }: { params: Params }) {
  const { id } = await params;
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const t = await getTranslations("Exam");

  const result = await getResultView(id, locale);
  if (!result) notFound();
  if ("inProgress" in result) {
    redirect({ href: `/exam/session/${id}`, locale });
    return null;
  }

  const { session, review, topics } = result;
  const percent = session.max_score ? Math.round(((session.score ?? 0) / session.max_score) * 100) : 0;
  const weakTopics = topics.filter((topic) => topic.weak);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <BackLink href={EXAM_PAGE[result.examType]}>{result.examType === "bbzhm" ? t("bbzhmShort") : t("untShort")}</BackLink>
        <Eyebrow>{result.title}</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("resultTitle")}</h1>
        {session.status === "expired" && (
          <Badge variant="outline" className="mt-2 border-amber text-amber">
            {t("timeIsUp")}
          </Badge>
        )}
      </div>

      {/* Жалпы нәтиже */}
      <Card className="gap-5 rounded-3xl border border-line p-6 ring-0 shadow-[0_1px_2px_var(--shadow)] sm:p-8 dark:shadow-none">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className={cn("font-mono text-5xl font-bold", percent >= 60 ? "text-good" : "text-amber")}>{percent}%</p>
          <p className="pb-1.5 text-muted-foreground">
            {t("scoreLine", { score: session.score ?? 0, max: session.max_score ?? 0 })}
          </p>
        </div>
        <dl className="m-0 grid grid-cols-3 gap-2.5">
          <Stat label={t("correct")} value={String(result.correctCount)} />
          <Stat label={t("wrongOrSkipped")} value={String(review.length - result.correctCount)} />
          <Stat label={t("timeSpent")} value={duration(session)} />
        </dl>
      </Card>

      {/* Тақырып бойынша «әлсіз жерлер» картасы */}
      <section>
        <h2 className="font-display text-lg font-semibold">{t("topicMap")}</h2>
        <p className="mt-1 mb-4 text-[0.88rem] text-muted-foreground">
          {weakTopics.length
            ? t("weakHint", { threshold: Math.round(WEAK_TOPIC_THRESHOLD * 100) })
            : t("noWeak")}
        </p>
        <ul className="flex flex-col gap-3">
          {topics.map((topic) => {
            const share = Math.round((topic.correct / topic.total) * 100);
            return (
              <li key={topic.topic} className="rounded-2xl border border-line bg-panel p-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-[0.92rem]">
                  <span className="flex items-center gap-2 font-semibold">
                    {topic.topic}
                    {topic.weak && (
                      <Badge variant="outline" className="border-pink/60 text-pink">
                        {t("weak")}
                      </Badge>
                    )}
                  </span>
                  <span className="shrink-0 font-mono text-muted-foreground">
                    {topic.correct}/{topic.total}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={share}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={topic.topic}
                  className="h-2.5 overflow-hidden rounded-full bg-panel-2"
                >
                  <div
                    className={cn("h-full rounded-full", share >= 80 ? "bg-good" : share >= 60 ? "bg-cyan" : share >= 40 ? "bg-amber" : "bg-pink")}
                    style={{ width: `${share}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link href={EXAM_PAGE[result.examType]} className={buttonVariants({ variant: "glow", size: "pill" })}>
          {t("tryAgain")}
        </Link>
        <Link href="/profile" className={buttonVariants({ variant: "panel", size: "pill" })}>
          {t("toProfile")}
        </Link>
      </div>

      {/* Сұрақтарды талдау: дұрыс жауап және түсіндірме (тест аяқталғаннан кейін ғана) */}
      <section>
        <h2 className="mb-4 font-display text-lg font-semibold">{t("review")}</h2>
        <ReviewList items={review} />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel-2 p-3">
      <dt className="text-[0.75rem] text-muted-foreground">{label}</dt>
      <dd className="m-0 mt-1 font-mono text-lg font-semibold">{value}</dd>
    </div>
  );
}
