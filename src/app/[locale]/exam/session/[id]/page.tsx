import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ExamRunner } from "@/components/exam/exam-runner";
import { getSessionView } from "@/features/exam/queries";
import { EXAM_PAGE } from "@/features/exam/scoring";
import { redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { BackLink } from "@/components/layout/back-link";

// Сессия id-і алдын ала белгісіз (әр тестте жаңа) — бет тек сұраныс кезінде сызылады
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Exam");
  return { title: t("sessionTitle") };
}

type Params = PageProps<"/[locale]/exam/session/[id]">["params"];

// Тест сессиясы: сұрақтар және таймер (уақыт шегін сервер бекіткен)
export default function ExamSessionPage({ params }: PageProps<"/[locale]/exam/session/[id]">) {
  const t = useTranslations("Exam");
  return (
    <div className="page-wrap py-6 md:py-10">
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <SessionContent params={params} />
      </Suspense>
    </div>
  );
}

async function SessionContent({ params }: { params: Params }) {
  const { id } = await params;
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;

  const t = await getTranslations("Exam");
  const view = await getSessionView(id, locale);
  if (!view) notFound();
  if (view.session.status !== "in_progress" || !view.session.deadline_at) {
    redirect({ href: `/exam/result/${id}`, locale });
    return null;
  }

  return (
    <>
      <BackLink href={EXAM_PAGE[view.examType]}>{view.examType === "bbzhm" ? t("bbzhmShort") : t("untShort")}</BackLink>
      <ExamRunner
        sessionId={id}
        title={view.title}
        deadline={view.session.deadline_at}
        serverNow={view.serverNow}
        questions={view.questions}
        initialAnswers={view.answers}
      />
    </>
  );
}
