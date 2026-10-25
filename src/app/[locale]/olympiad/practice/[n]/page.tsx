import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { ProblemRunner } from "@/components/olympiad/problem-runner";
import { adaptiveOrder } from "@/features/olympiad/practice";
import { getMyOlympiad, getTopicView, parseTopicN, TOPIC_COUNT } from "@/features/olympiad/server/queries";
import { Link } from "@/i18n/navigation";

export function generateStaticParams() {
  return Array.from({ length: TOPIC_COUNT }, (_, i) => ({ n: String(i + 1) }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/olympiad/practice/[n]">): Promise<Metadata> {
  const n = parseTopicN((await params).n);
  const t = await getTranslations("Olympiad");
  return { title: n ? `${t("practicePage.title")} · ${t("topicN", { n })}` : t("title") };
}

type Params = PageProps<"/[locale]/olympiad/practice/[n]">["params"];

// Жаттығу: банк + генератор есептері, оқушының меңгеру деңгейіне қарай реттеледі
export default function PracticePage({ params }: PageProps<"/[locale]/olympiad/practice/[n]">) {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <PracticeContent params={params} />
      </Suspense>
    </div>
  );
}

async function PracticeContent({ params }: { params: Params }) {
  const n = parseTopicN((await params).n);
  if (!n) notFound();
  const [view, me, t] = await Promise.all([getTopicView(n), getMyOlympiad(), getTranslations("Olympiad")]);
  if (!view) notFound();
  const queue = adaptiveOrder([...view.problems, ...view.generated], me?.mastery.get(n)?.level ?? 0);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <Link href={`/olympiad/topic/${n}`} className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("topicN", { n })}
      </Link>
      <header>
        <Eyebrow>{t("practicePage.title")}</Eyebrow>
        <h1 className="mt-2 text-[clamp(1.25rem,2.6vw,1.8rem)] leading-tight font-bold">{view.topic.title}</h1>
      </header>
      {!me && (
        <p className="rounded-2xl border border-line bg-panel-2 px-4 py-3 text-[0.9rem]">
          {t("guestNote")}{" "}
          <Link href="/login" className="font-semibold text-cyan underline">
            {t("login")}
          </Link>
        </p>
      )}
      {queue.length ? <ProblemRunner problems={queue} /> : <p className="text-muted-foreground">{t("practicePage.empty")}</p>}
    </div>
  );
}
