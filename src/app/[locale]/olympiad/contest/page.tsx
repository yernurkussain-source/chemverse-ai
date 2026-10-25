import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { ContestForm } from "@/components/olympiad/contest-form";
import { buttonVariants } from "@/components/ui/button";
import { getTeacherId } from "@/features/teacher/queries";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.contest");
  return { title: t("title") };
}

// «Жас химик-дарын» сайысы (33-сабақ): мұғалім бастайды → проектор экраны; оқушылар/командалар кодпен қосылады
export default function ContestPage() {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("map")}
        </Link>
        <header>
          <Eyebrow>{t("topicN", { n: 33 })}</Eyebrow>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-bold">{t("contest.title")}</h1>
          <p className="mt-1.5 text-muted-foreground">{t("contest.subtitle")}</p>
        </header>
        <ol className="flex list-decimal flex-col gap-1.5 rounded-3xl border border-line bg-panel p-5 pl-10 text-[0.95rem]">
          <li>{t("contest.step1")}</li>
          <li>{t("contest.step2")}</li>
          <li>{t("contest.step3")}</li>
        </ol>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <ContestStart />
        </Suspense>
      </div>
    </div>
  );
}

async function ContestStart() {
  const [{ isTeacher }, t] = await Promise.all([getTeacherId(), getTranslations("Olympiad.contest")]);
  if (isTeacher) return <ContestForm />;
  return (
    <div className="flex flex-col items-start gap-3 rounded-3xl border border-line bg-panel p-6">
      <p>{t("studentNote")}</p>
      <Link href="/join" className={buttonVariants({ variant: "glow", size: "pill" })}>
        {t("join")}
      </Link>
    </div>
  );
}
