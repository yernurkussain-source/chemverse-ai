import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { LabAssignmentForm } from "@/components/virtual-lab/teacher-forms";
import { deleteAssignment } from "@/features/teacher/actions";
import { getTeacherId } from "@/features/teacher/queries";
import { SHELL_LABS } from "@/features/virtual-lab/catalog";
import { getLabOverview, type LabClass } from "@/features/virtual-lab/teacher-queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ChemLab.teacherLabs");
  return { title: t("title") };
}

const scoreColor = (score: number) => (score >= 85 ? "text-good" : score >= 60 ? "text-cyan" : "text-amber");

// Мұғалім: ChemLab тапсырмалары мен нәтижелері (docs/chemlab/CHEMLAB_SPEC.md 2-бөлім)
export default function TeacherLabsPage() {
  const t = useTranslations("ChemLab.teacherLabs");
  return (
    <div className="page-wrap py-10 md:py-14">
      <Link href="/teacher" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("toTeacher")}
      </Link>
      <Eyebrow className="mt-5">{t("eyebrow")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-8 max-w-[68ch] text-muted-foreground">{t("subtitle")}</p>
      <Suspense fallback={<p className="text-muted-foreground">…</p>}>
        <Content />
      </Suspense>
    </div>
  );
}

async function Content() {
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const t = await getTranslations("ChemLab");
  const { userId, isTeacher } = await getTeacherId();
  if (!userId) {
    redirect({ href: "/login", locale });
    return null;
  }
  if (!isTeacher) {
    return <Card className="max-w-xl rounded-3xl border border-amber/50 bg-amber/10 p-6 ring-0">{t("teacherLabs.notTeacher")}</Card>;
  }

  const { classes, migrated } = await getLabOverview(userId);
  if (!classes.length) {
    return (
      <Card className="max-w-xl gap-3 rounded-3xl border border-line p-6 ring-0">
        <p>{t("teacherLabs.noClasses")}</p>
        <Link href="/teacher" className={`${buttonVariants({ variant: "panel", size: "pill-sm" })} self-start`}>
          {t("teacherLabs.toTeacher")}
        </Link>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
      <div className="flex min-w-0 flex-col gap-8">
        {classes.map((cls) => (
          <ClassResults key={cls.id} cls={cls} />
        ))}
      </div>
      <Card className="h-fit gap-4 rounded-3xl border border-line p-5 ring-0 shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
        <h2 className="font-display text-lg font-semibold">{t("teacherLabs.assignTitle")}</h2>
        {!migrated && <p className="rounded-xl border border-amber/50 bg-amber/10 px-3 py-2 text-[0.82rem] text-amber">{t("teacherLabs.migration")}</p>}
        <LabAssignmentForm classes={classes.map((c) => ({ id: c.id, name: c.name }))} />
      </Card>
    </div>
  );
}

async function ClassResults({ cls }: { cls: LabClass }) {
  const t = await getTranslations("ChemLab");
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-bold">{cls.name}</h2>

      <div>
        <h3 className="mb-2 font-display font-semibold">{t("teacherLabs.resultsTitle")}</h3>
        {cls.students.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-5 text-center text-muted-foreground">{t("teacherLabs.noStudents")}</p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-panel">
            <table className="w-full min-w-[36rem] text-[0.88rem]">
              <thead>
                <tr className="border-b border-line text-left text-[0.78rem] text-muted-foreground">
                  <th scope="col" className="px-3 py-2.5 font-semibold">
                    {t("teacherLabs.student")}
                  </th>
                  {SHELL_LABS.map((slug) => (
                    <th key={slug} scope="col" className="px-2 py-2.5 text-center font-semibold">
                      {t(`catalog.${slug}.title`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cls.students.map((student) => (
                  <tr key={student.id} className="border-b border-line last:border-0">
                    <th scope="row" className="px-3 py-2.5 text-left font-semibold">
                      {student.name}
                    </th>
                    {SHELL_LABS.map((slug) => {
                      const cell = student.labs[slug];
                      return (
                        <td key={slug} className="px-2 py-2.5 text-center font-mono">
                          {cell ? (
                            <Link href={`/virtual-lab/${slug}/result/${cell.attemptId}`} className={cn("font-semibold hover:underline", scoreColor(cell.score))}>
                              {cell.score}
                              <span className="block text-[0.68rem] font-normal text-muted-foreground">{t("teacherLabs.attempts", { count: cell.attempts })}</span>
                            </Link>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="bg-panel-2/60 text-[0.82rem]">
                  <th scope="row" className="px-3 py-2 text-left font-semibold text-muted-foreground">
                    {t("teacherLabs.average")}
                  </th>
                  {SHELL_LABS.map((slug) => {
                    const scores = cls.students.flatMap((s) => (s.labs[slug] ? [s.labs[slug].score] : []));
                    return (
                      <td key={slug} className="px-2 py-2 text-center font-mono">
                        {scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : "—"}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-display font-semibold">{t("teacherLabs.assignmentsTitle")}</h3>
        {cls.assignments.length === 0 ? (
          <p className="text-[0.9rem] text-muted-foreground">{t("teacherLabs.noAssignments")}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {cls.assignments.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel px-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold">{a.title || t(`catalog.${a.slug}.title`)}</p>
                  <p className="text-[0.8rem] text-muted-foreground">{a.dueAt ? t("teacherLabs.dueDate", { date: a.dueAt.slice(0, 10) }) : t("teacherLabs.noDue")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[0.88rem]">{t("teacherLabs.done", { done: a.done, total: cls.students.length })}</span>
                  <form action={deleteAssignment}>
                    <input type="hidden" name="id" value={a.id} />
                    <button type="submit" className="text-[0.8rem] text-muted-foreground hover:text-pink">
                      {t("teacherLabs.delete")}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
