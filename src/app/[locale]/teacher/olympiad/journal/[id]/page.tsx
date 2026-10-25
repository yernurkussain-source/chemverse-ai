import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { JournalForm } from "@/components/olympiad/teacher-forms";
import { getTopics } from "@/features/olympiad/server/queries";
import { getJournal } from "@/features/olympiad/server/teacher";
import { getTeacherId } from "@/features/teacher/queries";
import { Link } from "@/i18n/navigation";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.teacher.journal");
  return { title: t("title") };
}

type Params = PageProps<"/[locale]/teacher/olympiad/journal/[id]">["params"];

// Бір сабақтың журналы: қатысу, үй тапсырмасы (тек сол сыныптың мұғалімі — RLS)
export default function JournalPage({ params }: PageProps<"/[locale]/teacher/olympiad/journal/[id]">) {
  const t = useTranslations("Olympiad.teacher");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/teacher/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("title")}
        </Link>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <JournalContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function JournalContent({ params }: { params: Params }) {
  const { id } = await params;
  const { isTeacher } = await getTeacherId();
  if (!isTeacher) notFound();
  const [journal, topics, t, format] = await Promise.all([getJournal(id), getTopics(), getTranslations("Olympiad"), getFormatter()]);
  if (!journal) notFound();
  const { session, students, marks } = journal;
  return (
    <>
      <header>
        <Eyebrow>
          {t("teacher.journal.title")} · {format.dateTime(new Date(session.date), { day: "numeric", month: "long", timeZone: "UTC" })}
          {session.lesson_time && ` · ${session.lesson_time.slice(0, 5)}`}
        </Eyebrow>
        <h1 className="mt-2 text-[clamp(1.25rem,2.6vw,1.8rem)] font-bold">
          {t("topicN", { n: session.topic })}: {topics.find((topic) => topic.n === session.topic)?.title}
        </h1>
      </header>
      <JournalForm
        sessionId={session.id}
        note={session.note}
        students={students.map((s) => ({ ...s, present: marks.get(s.id)?.present ?? false, homework: marks.get(s.id)?.homework ?? false }))}
      />
    </>
  );
}
