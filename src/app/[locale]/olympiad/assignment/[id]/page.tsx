import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { ProblemRunner } from "@/components/olympiad/problem-runner";
import type { OlympiadAssignment } from "@/features/olympiad/assignments";
import { GEN } from "@/features/olympiad/core";
import { generatedProblem, toPublic } from "@/features/olympiad/practice";
import { loadProblems } from "@/features/olympiad/server/mocks";
import { Link } from "@/i18n/navigation";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad");
  return { title: t("assignmentPage") };
}

type Params = PageProps<"/[locale]/olympiad/assignment/[id]">["params"];

// Мұғалімнің олимпиада тапсырмасы: есептер жиыны (генератор есептері бекітілген seed-пен — бәріне бірдей)
export default function AssignmentPage({ params }: PageProps<"/[locale]/olympiad/assignment/[id]">) {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/profile" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("toProfile")}
        </Link>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <AssignmentContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function AssignmentContent({ params }: { params: Params }) {
  const { id } = await params;
  // RLS: тек сынып мүшесі не мұғалімі көреді
  const supabase = await createClient();
  const { data: assignment } = await supabase
    .from("assignments")
    .select("id, title, due_at, olympiad")
    .eq("id", id)
    .maybeSingle<{ id: string; title: string | null; due_at: string | null; olympiad: OlympiadAssignment | null }>();
  if (!assignment?.olympiad) notFound();
  const { topic, items } = assignment.olympiad;
  const bank = new Map((await loadProblems(items.flatMap((i) => ("problemId" in i ? [i.problemId] : [])))).map((p) => [p.id, p]));
  const problems = items.flatMap((item) => {
    if ("problemId" in item) {
      const p = bank.get(item.problemId);
      return p ? [toPublic(p)] : [];
    }
    return Object.hasOwn(GEN, item.generator) ? [generatedProblem(item.generator, item.seed)] : [];
  });
  const [t, format] = await Promise.all([getTranslations("Olympiad"), getFormatter()]);

  return (
    <>
      <header>
        <Eyebrow>
          {t("assignmentPage")}
          {assignment.due_at && ` · ${t("teacher.assignments.dueShort", { date: format.dateTime(new Date(assignment.due_at), { day: "numeric", month: "long" }) })}`}
        </Eyebrow>
        <h1 className="mt-2 text-[clamp(1.3rem,2.8vw,1.9rem)] font-bold">{assignment.title || t("assignmentTitle", { n: topic })}</h1>
      </header>
      {problems.length ? <ProblemRunner problems={problems} /> : <p className="text-muted-foreground">{t("practicePage.empty")}</p>}
    </>
  );
}
