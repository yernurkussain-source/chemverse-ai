import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LiveHost } from "@/components/live/live-host";
import { joinUrl } from "@/features/live/join-url";
import { CONTEST_ROUNDS, contestSlug, roundStarts, type ContestRound } from "@/features/olympiad/contest";
import { getTeacherId } from "@/features/teacher/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Сессия id-і алдын ала белгісіз — бет тек сұраныс кезінде сызылады
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.contest");
  return { title: t("title") };
}

type Params = PageProps<"/[locale]/olympiad/contest/[id]">["params"];

// Сайыстың проектор экраны: Live Class хосты + раунд атаулары
export default function ContestHostPage({ params }: PageProps<"/[locale]/olympiad/contest/[id]">) {
  const t = useTranslations("Olympiad.contest");
  return (
    <div className="page-wrap py-6 md:py-8">
      <Link href="/olympiad/contest" className="mb-4 inline-block text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("title")}
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <HostContent params={params} />
      </Suspense>
    </div>
  );
}

async function HostContent({ params }: { params: Params }) {
  const { id } = await params;
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const { userId, isTeacher } = await getTeacherId();
  if (!userId || !isTeacher) {
    redirect({ href: "/olympiad/contest", locale });
    return null;
  }
  // RLS: мұғалім тек өз сессиясын көреді
  const supabase = await createClient();
  const admin = createAdminClient();
  const { data: session } = await supabase.from("live_sessions").select("id, code, question_ids").eq("id", id).maybeSingle();
  if (!session || !admin) notFound();

  // Әр сұрақтың раунды (exams.slug арқылы)
  const { data: exams } = await admin.from("exams").select("id, slug").in("slug", CONTEST_ROUNDS.map(contestSlug));
  const { data: links } = await admin
    .from("exam_questions")
    .select("exam_id, question_id")
    .in("question_id", session.question_ids as string[]);
  const roundOfExam = new Map((exams ?? []).map((e) => [e.id as string, CONTEST_ROUNDS.find((r) => contestSlug(r) === e.slug)]));
  const roundOf = new Map<string, ContestRound>();
  for (const l of links ?? []) {
    const round = roundOfExam.get(l.exam_id as string);
    if (round) roundOf.set(l.question_id as string, round);
  }
  const t = await getTranslations("Olympiad.contest");
  const rounds = roundStarts(session.question_ids as string[], roundOf).map(({ round, from }) => ({ title: t(`rounds.${round}`), from }));

  return (
    <LiveHost
      sessionId={session.id as string}
      code={session.code as string}
      joinUrl={await joinUrl(session.code as string, locale)}
      rounds={rounds}
    />
  );
}
