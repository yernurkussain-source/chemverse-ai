import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { DeleteClassButton } from "@/components/teacher/delete-class-button";
import { AssignmentForm } from "@/components/teacher/forms";
import { Card } from "@/components/ui/card";
import { isWeakTopic } from "@/features/exam/scoring";
import { deleteAssignment, removeStudent } from "@/features/teacher/actions";
import { getClassDetail, getTeacherId, type ClassTopic } from "@/features/teacher/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { formatDecimal } from "@/lib/format";
import { cn } from "@/lib/utils";

// Сынып id-і алдын ала белгісіз — бет тек сұраныс кезінде сызылады
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Teacher");
  return { title: t("classTitle") };
}

type Params = PageProps<"/[locale]/teacher/classes/[id]">["params"];

export default function ClassPage({ params }: PageProps<"/[locale]/teacher/classes/[id]">) {
  const t = useTranslations("Teacher");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/teacher" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("backToClasses")}
      </Link>
      <Suspense fallback={<p className="mt-5 text-muted-foreground">{t("loading")}</p>}>
        <ClassContent params={params} />
      </Suspense>
    </div>
  );
}

const pctColor = (pct: number | null) =>
  pct === null ? "text-muted-foreground" : pct >= 80 ? "text-good" : pct >= 60 ? "text-cyan" : pct >= 40 ? "text-amber" : "text-pink";

/** Тақырыптар картасында бірден көрінетін (ең әлсіз) тақырыптар саны, қалғаны «Барлығы» ішінде */
const TOPICS_SHOWN = 8;

type TeacherT = Awaited<ReturnType<typeof getTranslations<"Teacher">>>;

function TopicList({ topics, t }: { topics: ClassTopic[]; t: TeacherT }) {
  return (
    <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
      {topics.map((topic) => {
        const pct = Math.round((topic.correct / topic.answered) * 100);
        const weak = isWeakTopic(topic);
        return (
          <li key={topic.slug} className={cn("rounded-2xl border bg-panel px-4 py-3", weak ? "border-pink/40" : "border-line")}>
            <div className="flex items-baseline justify-between gap-3">
              {topic.hasLesson ? (
                <Link href={`/learn/${topic.slug}`} className="min-w-0 font-semibold hover:text-cyan">
                  {topic.title}
                </Link>
              ) : (
                <span className="min-w-0 font-semibold">{topic.title}</span>
              )}
              <span className={cn("shrink-0 font-mono font-semibold", pctColor(pct))}>{pct}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2" aria-hidden>
              <div className={cn("h-full rounded-full", weak ? "bg-pink" : "bg-cyan")} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1.5 text-[0.78rem] text-muted-foreground">
              {t("topicsMeta", { students: topic.students, correct: topic.correct, answered: topic.answered })}
              {weak && (
                <>
                  {" · "}
                  <b className="text-pink">{t("topicsWeak")}</b>
                </>
              )}
            </p>
          </li>
        );
      })}
    </ul>
  );
}

async function ClassContent({ params }: { params: Params }) {
  const { id } = await params;
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const t = await getTranslations("Teacher");

  const { userId, isTeacher } = await getTeacherId();
  if (!userId || !isTeacher) {
    redirect({ href: "/teacher", locale });
    return null;
  }
  const detail = await getClassDetail(id, userId, locale);
  if (!detail) notFound();

  const date = (iso: string | null) => (iso ? iso.slice(0, 10) : "—");

  return (
    <div className="mt-5 flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{detail.name}</h1>
          <p className="text-muted-foreground">{t("studentsCount", { count: detail.students.length })}</p>
        </div>
        <div className="rounded-2xl border border-cyan-dim bg-cyan/5 px-5 py-3 text-center">
          <p className="text-[0.78rem] text-muted-foreground">{t("joinCode")}</p>
          <p className="font-mono text-3xl font-bold tracking-[0.15em] text-cyan">
            {detail.joinCode.slice(0, 3)} {detail.joinCode.slice(3)}
          </p>
          <p className="mt-1 max-w-[26ch] text-[0.74rem] text-muted-foreground">{t("joinHint")}</p>
        </div>
      </div>

      {/* Оқушылар және нәтижелері */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-semibold">{t("students")}</h2>
          {detail.students.length > 0 && (
            // Файл жүктеледі (route handler), сондықтан Link емес, кәдімгі сілтеме
            <a href={`/${locale}/teacher/classes/${detail.id}/export`} download className="text-[0.9rem] font-semibold text-cyan hover:underline">
              ⬇ {t("csvExport")}
            </a>
          )}
        </div>
        {detail.students.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">{t("noStudents")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[640px] text-left text-[0.9rem]">
              <thead className="bg-panel-2 text-[0.78rem] text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">{t("student")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("tests")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("lastTest")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("avgTest")}</th>
                  <th className="px-3 py-2.5 font-semibold">{t("labs")}</th>
                  <th className="px-3 py-2.5 font-semibold">XP</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {detail.students.map((s) => (
                  <tr key={s.id} className="border-t border-line bg-panel">
                    <td className="px-4 py-2.5 font-semibold">{s.name}</td>
                    <td className="px-3 py-2.5 font-mono">{s.exams}</td>
                    <td className={cn("px-3 py-2.5 font-mono font-semibold", pctColor(s.lastExamPct))}>
                      {s.lastExamPct === null ? "—" : `${s.lastExamPct}%`}
                    </td>
                    <td className={cn("px-3 py-2.5 font-mono", pctColor(s.avgExamPct))}>
                      {s.avgExamPct === null ? "—" : `${s.avgExamPct}%`}
                    </td>
                    <td className="px-3 py-2.5 font-mono">
                      {s.labs}
                      {s.bestLabErrorPct !== null && (
                        <span className="text-muted-foreground"> · {t("bestError", { value: formatDecimal(s.bestLabErrorPct, locale, 1) })}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-cyan">{s.xp}</td>
                    <td className="px-3 py-2.5 text-right">
                      <form action={removeStudent}>
                        <input type="hidden" name="classId" value={detail.id} />
                        <input type="hidden" name="userId" value={s.id} />
                        <button type="submit" className="text-[0.8rem] text-muted-foreground hover:text-pink" title={t("removeHint")}>
                          {t("remove")}
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Тақырыптар картасы: сыныптың әр тақырып бойынша нәтижесі, ең әлсізі бірінші */}
      <section>
        <h2 className="font-display text-lg font-semibold">{t("topicsTitle")}</h2>
        <p className="mt-1 mb-3 text-[0.88rem] text-muted-foreground">{t("topicsHint")}</p>
        {detail.topics.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">{t("topicsEmpty")}</p>
        ) : (
          <>
            <TopicList topics={detail.topics.slice(0, TOPICS_SHOWN)} t={t} />
            {detail.topics.length > TOPICS_SHOWN && (
              <details className="mt-3">
                <summary className="cursor-pointer text-[0.9rem] font-semibold text-cyan">{t("topicsAll", { count: detail.topics.length })}</summary>
                <div className="mt-3">
                  <TopicList topics={detail.topics.slice(TOPICS_SHOWN)} t={t} />
                </div>
              </details>
            )}
          </>
        )}
      </section>

      {/* Тапсырмалар */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          <h2 className="mb-3 font-display text-lg font-semibold">{t("assignments")}</h2>
          {detail.assignments.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">{t("noAssignments")}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {detail.assignments.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{a.title}</p>
                    <p className="text-[0.8rem] text-muted-foreground">
                      {t("assigned", { date: date(a.createdAt) })} · {t("due", { date: date(a.dueAt) })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[0.9rem]">
                      <b className="text-good">{a.done}</b>/{detail.students.length} {t("doneShort")}
                    </span>
                    <form action={deleteAssignment}>
                      <input type="hidden" name="id" value={a.id} />
                      <button type="submit" className="text-[0.8rem] text-muted-foreground hover:text-pink">
                        {t("delete")}
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Card className="h-fit gap-4 rounded-3xl border border-line p-5 ring-0 shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
          <h2 className="font-display text-lg font-semibold">{t("newAssignment")}</h2>
          <AssignmentForm classId={detail.id} exams={detail.exams} />
        </Card>
      </section>

      <section className="border-t border-line pt-6">
        <DeleteClassButton classId={detail.id} name={detail.name} students={detail.students.length} />
      </section>
    </div>
  );
}
