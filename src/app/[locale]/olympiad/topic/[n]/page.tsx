import { Suspense, type ReactNode } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { StepReveal } from "@/components/olympiad/hint-ladder";
import { MasteryBar } from "@/components/olympiad/mastery-bar";
import { ProblemRunner } from "@/components/olympiad/problem-runner";
import { buttonVariants } from "@/components/ui/button";
import { selfCheckSet } from "@/features/olympiad/practice";
import { getMyOlympiad, getTopicView, parseTopicN, TOPIC_COUNT, type Topic } from "@/features/olympiad/server/queries";
import { getLab, labHref } from "@/features/virtual-lab/catalog";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function generateStaticParams() {
  return Array.from({ length: TOPIC_COUNT }, (_, i) => ({ n: String(i + 1) }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/olympiad/topic/[n]">): Promise<Metadata> {
  const n = parseTopicN((await params).n);
  const t = await getTranslations("Olympiad");
  return { title: n ? `${t("topicN", { n })} · ${t("title")}` : t("title") };
}

type Params = PageProps<"/[locale]/olympiad/topic/[n]">["params"];

// Тақырып беті (OLYMPIAD_SPEC 3-бөлім): мақсат, ұғымдар, кеңес, шешілген мысал, жаттығу, зертхана, өзін-өзі тексеру, AI
export default function TopicPage({ params }: PageProps<"/[locale]/olympiad/topic/[n]">) {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("map")}
      </Link>
      <Suspense fallback={<p className="mt-6 text-muted-foreground">{t("loading")}</p>}>
        <TopicContent params={params} />
      </Suspense>
    </div>
  );
}

function Block({ title, children, accent }: { title: string; children: ReactNode; accent?: boolean }) {
  return (
    <section className={cn("rounded-3xl border bg-panel p-5 sm:p-6", accent ? "border-cyan-dim" : "border-line")}>
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

async function TopicContent({ params }: { params: Params }) {
  const n = parseTopicN((await params).n);
  if (!n) notFound();
  const [view, me, t] = await Promise.all([getTopicView(n), getMyOlympiad(), getTranslations("Olympiad")]);
  if (!view) notFound();

  const { topic, example, problems, generated } = view;
  const mastery = me?.mastery.get(n);
  const reviewDue = Boolean(me && mastery?.nextReview && mastery.nextReview <= me.today);
  const selfCheck = selfCheckSet(problems, generated);

  return (
    <article className="mt-5 flex flex-col gap-4">
      <header className="mb-2">
        <Eyebrow>
          {t("topicN", { n })} · {topic.block}
        </Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.4rem,3vw,2.1rem)] leading-tight font-bold">{topic.title}</h1>
        {me && <MasteryBar value={mastery?.level ?? 0} label={t("mastery")} className="mt-4 max-w-xs" />}
      </header>

      <Block title={t("topic.goals")}>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          {topic.goals.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
      </Block>

      <Block title={t("topic.key")}>
        <ul className="flex flex-wrap gap-2">
          {topic.key.map((key) => (
            <li key={key} className="rounded-full border border-line bg-panel-2 px-3 py-1 text-[0.88rem]">
              {key}
            </li>
          ))}
        </ul>
      </Block>

      <Block title={`🏆 ${t("topic.tip")}`} accent>
        <p>{topic.olympiadTip}</p>
      </Block>

      {example && (
        <Block title={t("topic.example")}>
          <p className="mb-3 leading-relaxed font-semibold whitespace-pre-line">{example.kk}</p>
          {example.choices && (
            <ol className="mb-4 flex list-[upper-alpha] flex-col gap-1 pl-6 text-[0.95rem] text-muted-foreground">
              {example.choices.map((choice) => (
                <li key={choice}>{choice}</li>
              ))}
            </ol>
          )}
          <StepReveal steps={example.solution} />
        </Block>
      )}

      <Block title={t("topic.practice")}>
        {problems.length + generated.length > 0 ? (
          <>
            <p className="mb-4 text-muted-foreground">{t("topic.practiceText", { bank: problems.length, gen: generated.length })}</p>
            <Link href={`/olympiad/practice/${n}`} className={buttonVariants({ variant: "glow", size: "pill" })}>
              {reviewDue ? t("topic.reviewStart") : t("topic.practiceStart")} →
            </Link>
          </>
        ) : (
          <p className="text-muted-foreground">{t("topic.noPractice")}</p>
        )}
      </Block>

      {topic.labs.length > 0 && (
        <Block title={`🧪 ${t("topic.labs")}`}>
          <LabLinks labs={topic.labs} />
        </Block>
      )}

      {selfCheck.length > 0 && (
        <section className="flex flex-col gap-3">
          <div>
            <h2 className="font-display text-lg font-semibold">{t("topic.selfCheck")}</h2>
            <p className="text-[0.92rem] text-muted-foreground">{t("topic.selfCheckText", { count: selfCheck.length })}</p>
          </div>
          <ProblemRunner problems={selfCheck} />
        </section>
      )}

      <Block title={`✨ ${t("topic.ai")}`}>
        <p className="mb-4 text-muted-foreground">{t("topic.aiText")}</p>
        <Link
          href={{
            pathname: "/ai-tutor",
            query: { mode: "socratic", q: t("topic.aiPrompt", { title: topic.title, key: topic.key.join(", ") }) },
          }}
          className={buttonVariants({ variant: "panel", size: "pill" })}
        >
          {t("topic.aiOpen")}
        </Link>
      </Block>
    </article>
  );
}

const SITE_HREF: Record<string, string> = { "periodic-table": "/periodic-table", molecules: "/molecules", live: "/join" };

/** Тақырыпқа байланысты зертханалар: 3D ойын тапсырмасы, ChemLab тәжірибесі, сайт бөлімі */
async function LabLinks({ labs }: { labs: Topic["labs"] }) {
  const [t, tGame, tLab] = await Promise.all([
    getTranslations("Olympiad.labs"),
    getTranslations("VirtualLab3D.quests"),
    getTranslations("ChemLab.catalog"),
  ]);
  const items = labs.map(({ kind, id }) => {
    if (kind === "game") {
      const key = `${id}.t`;
      return { kind, href: "/game", title: tGame.has(key as never) ? tGame(key as never) : t("anyQuest") };
    }
    if (kind === "chemlab") {
      const lab = getLab(id);
      const key = `${id}.title`;
      return { kind, href: lab?.status === "ready" ? labHref(lab) : null, title: tLab.has(key as never) ? tLab(key as never) : id };
    }
    const key = `sites.${id}`;
    return { kind, href: SITE_HREF[id] ?? null, title: t.has(key as never) ? t(key as never) : id };
  });

  return (
    <ul className="grid gap-2 sm:grid-cols-2">
      {items.map((item, i) => {
        const body = (
          <>
            <span className="font-mono text-[0.72rem] font-semibold tracking-wider text-cyan uppercase">{t(item.kind)}</span>
            <span className="font-semibold">{item.title}</span>
            {!item.href && <span className="text-[0.8rem] text-muted-foreground">🔒 {t("soon")}</span>}
          </>
        );
        const className = "flex h-full flex-col gap-0.5 rounded-2xl border border-line bg-panel-2 px-4 py-3";
        return (
          <li key={i}>
            {item.href ? (
              <Link href={item.href} className={cn(className, "hover:border-cyan-dim")}>
                {body}
              </Link>
            ) : (
              <div className={cn(className, "opacity-70")}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
