import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { ProblemRunner } from "@/components/olympiad/problem-runner";
import { buttonVariants } from "@/components/ui/button";
import { getMyOpenAnswers } from "@/features/olympiad/server/open-answers";
import { getMistakes, getMyOlympiad } from "@/features/olympiad/server/queries";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.mistakes");
  return { title: t("title") };
}

// «Қателер дәптері» (OLYMPIAD_SPEC 6-бөлім): қате есеп дұрыс шыққанша осында тұрады
export default function MistakesPage() {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("map")}
        </Link>
        <header>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-bold">{t("mistakes.title")}</h1>
          <p className="mt-1.5 text-muted-foreground">{t("mistakes.subtitle")}</p>
        </header>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <MistakesList />
        </Suspense>
      </div>
    </div>
  );
}

async function MistakesList() {
  const [me, t] = await Promise.all([getMyOlympiad(), getTranslations("Olympiad")]);
  if (!me) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-3xl border border-line bg-panel p-6">
        <p>{t("mistakes.login")}</p>
        <Link href="/login" className={buttonVariants({ variant: "glow", size: "pill" })}>
          {t("login")}
        </Link>
      </div>
    );
  }
  const [problems, openAnswers] = await Promise.all([getMistakes(me.userId), getMyOpenAnswers(me.userId)]);
  return (
    <>
      {problems.length ? (
        <ProblemRunner problems={problems} showTopic />
      ) : (
        <p className="rounded-3xl border border-good/40 bg-good/10 p-6 text-good">{t("mistakes.empty")}</p>
      )}
      {openAnswers.length > 0 && (
        <section aria-labelledby="my-open" className="mt-6 flex flex-col gap-3">
          <h2 id="my-open" className="font-display text-lg font-semibold">
            {t("myOpen.title")}
          </h2>
          <ul className="flex flex-col gap-3">
            {openAnswers.map((a) => (
              <li key={a.id} className="flex flex-col gap-2 rounded-2xl border border-line bg-panel p-4 text-[0.92rem]">
                {a.problem && <p className="line-clamp-2 font-semibold">{a.problem.kk}</p>}
                <p className="font-mono text-[0.85rem] text-muted-foreground">
                  {a.aiScore === null ? t("teacher.open.aiNone") : t("problem.aiScore", { score: a.aiScore, max: a.maxScore })}
                </p>
                {a.reviewedAt ? (
                  <p className="rounded-xl border border-good/40 bg-good/10 px-3 py-2">
                    <span className="font-mono font-semibold text-good">{t("myOpen.teacher", { score: a.teacherScore ?? 0, max: a.maxScore })}</span>
                    {a.teacherComment && <span> — {a.teacherComment}</span>}
                  </p>
                ) : (
                  <p className="text-muted-foreground">{t("myOpen.pending")}</p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
