import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getFormatter, getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { MasteryBar } from "@/components/olympiad/mastery-bar";
import { buttonVariants } from "@/components/ui/button";
import { getMyOlympiad, getTopics, type Topic } from "@/features/olympiad/server/queries";
import { Link } from "@/i18n/navigation";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad");
  return { title: t("title"), description: t("subtitle") };
}

// Курс картасы (OLYMPIAD_SPEC 2-бөлім): 34 тақырып блоктар бойынша, меңгеру деңгейі, қайталау, сабақ күні
export default function OlympiadPage() {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-8 md:py-12">
      <BackLink href="/learn" />
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-6 max-w-[62ch] text-muted-foreground">{t("subtitle")}</p>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <TopicMap />
      </Suspense>
    </div>
  );
}

async function TopicMap() {
  const [topics, me, t, format] = await Promise.all([getTopics(), getMyOlympiad(), getTranslations("Olympiad"), getFormatter()]);
  if (!topics.length) return <p className="text-muted-foreground">{t("notConfigured")}</p>;

  const blocks = new Map<string, Topic[]>();
  for (const topic of topics) blocks.set(topic.block, [...(blocks.get(topic.block) ?? []), topic]);

  return (
    <>
      <div className="mb-8">
        {me ? (
          <nav className="flex flex-wrap gap-2">
            <Link href="/olympiad/mistakes" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
              📒 {t("mistakesLink")}
            </Link>
            <Link href="/olympiad/mock" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
              ⏱ {t("mockLink")}
            </Link>
            <Link href="/olympiad/contest" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
              🏆 {t("contestLink")}
            </Link>
            <Link href="/olympiad/projects" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
              🔬 {t("projectsLink")}
            </Link>
            <Link href="/olympiad/rating" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
              📊 {t("ratingLink")}
            </Link>
          </nav>
        ) : (
          <p className="rounded-2xl border border-line bg-panel-2 px-4 py-3 text-[0.9rem]">
            {t("guestNote")}{" "}
            <Link href="/login" className="font-semibold text-cyan underline">
              {t("login")}
            </Link>
          </p>
        )}
      </div>
      {[...blocks].map(([block, list]) => (
        <section key={block} className="mb-8">
          <h2 className="mb-3 font-display text-lg font-semibold">{block}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((topic) => {
              const mastery = me?.mastery.get(topic.n);
              const reviewDue = Boolean(me && mastery?.nextReview && mastery.nextReview <= me.today);
              const lesson = me?.nextLesson.get(topic.n);
              return (
                <li key={topic.n}>
                  <Link
                    href={`/olympiad/topic/${topic.n}`}
                    className="flex h-full flex-col gap-2 rounded-[18px] border border-line bg-panel p-4 shadow-[0_1px_2px_var(--shadow)] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-cyan-dim dark:shadow-none"
                  >
                    <span className="flex items-center justify-between gap-2 text-[0.75rem]">
                      <span className="font-mono font-semibold text-cyan">{t("topicN", { n: topic.n })}</span>
                      {reviewDue && <span className="rounded-full bg-amber/15 px-2 py-0.5 font-semibold text-amber">{t("reviewDue")}</span>}
                    </span>
                    <span className="line-clamp-3 font-display text-[0.98rem] leading-snug font-semibold">{topic.title}</span>
                    {lesson && (
                      <span className="text-[0.8rem] text-muted-foreground">
                        {t("nextLesson", { date: format.dateTime(new Date(lesson), { day: "numeric", month: "long", timeZone: "UTC" }) })}
                      </span>
                    )}
                    {me && <MasteryBar value={mastery?.level ?? 0} label={t("mastery")} className="mt-auto pt-1" />}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </>
  );
}
