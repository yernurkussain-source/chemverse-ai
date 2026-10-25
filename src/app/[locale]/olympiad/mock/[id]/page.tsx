import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { MasteryBar } from "@/components/olympiad/mastery-bar";
import { MockRunner } from "@/components/olympiad/mock-runner";
import { Button, buttonVariants } from "@/components/ui/button";
import { weakTopics } from "@/features/olympiad/mock";
import { startMock } from "@/features/olympiad/mock-actions";
import { getMockView } from "@/features/olympiad/server/mocks";
import { getTopics } from "@/features/olympiad/server/queries";
import { getTeacherId } from "@/features/teacher/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

// Сынақ id-і алдын ала белгісіз — бет тек сұраныс кезінде сызылады
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.mock");
  return { title: t("title") };
}

type Params = PageProps<"/[locale]/olympiad/mock/[id]">["params"];

export default function MockPage({ params }: PageProps<"/[locale]/olympiad/mock/[id]">) {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/olympiad/mock" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("mock.title")}
        </Link>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <MockContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function MockContent({ params }: { params: Params }) {
  const { id } = await params;
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const { userId } = await getTeacherId();
  if (!userId) {
    redirect({ href: "/login", locale });
    return null;
  }
  const [view, t] = await Promise.all([getMockView(id, userId), getTranslations("Olympiad")]);
  if (!view) notFound();
  const { mock, result, bank } = view;

  const header = (
    <header>
      <Eyebrow>{t("mock.title")}</Eyebrow>
      <h1 className="mt-2 text-[clamp(1.3rem,2.8vw,1.9rem)] font-bold">{mock.title}</h1>
      <p className="mt-1 text-[0.9rem] text-muted-foreground">{t("mock.info", { count: bank.length, minutes: mock.duration_min })}</p>
    </header>
  );

  if (!result) {
    return (
      <>
        {header}
        <div className="flex flex-col items-start gap-3 rounded-3xl border border-line bg-panel p-6">
          <p>{t("mock.startNote", { minutes: mock.duration_min })}</p>
          <form action={startMock}>
            <input type="hidden" name="mockId" value={mock.id} />
            <input type="hidden" name="locale" value={locale} />
            <Button type="submit" variant="glow" size="pill">
              {t("mock.start")}
            </Button>
          </form>
        </div>
      </>
    );
  }

  if (result.score === null) {
    return (
      <>
        {header}
        <MockRunner mockId={mock.id} problems={view.problems} startedAt={result.details.startedAt} durationMin={mock.duration_min} serverNow={view.serverNow} />
      </>
    );
  }

  // Нәтиже және талдау: тақырыптар бойынша, қайталау тізімі (дұрыс жауаптар көрсетілмейді — сынып әлі тапсырып жатуы мүмкін)
  const topics = new Map((await getTopics()).map((topic) => [topic.n, topic.title]));
  const { score, details } = result;
  const max = details.max ?? 0;
  const byTopic = Object.entries(details.byTopic ?? {}).map(([n, v]) => ({ n: Number(n), ...v }));
  const weak = weakTopics(details.byTopic ?? {});

  return (
    <>
      {header}
      <section className="flex flex-col gap-2 rounded-3xl border border-cyan-dim bg-panel p-6">
        <p className="font-mono text-[clamp(2rem,6vw,3rem)] leading-none font-bold text-cyan">
          {Number(score)} / {max}
        </p>
        <p className="text-muted-foreground">{t("mock.scoreNote")}</p>
        {details.late && <p className="text-[0.9rem] text-amber">{t("mock.late")}</p>}
      </section>

      <section className="flex flex-col gap-3 rounded-3xl border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-semibold">{t("mock.byTopic")}</h2>
        <ul className="flex flex-col gap-2.5">
          {byTopic.map((row) => (
            <li key={row.n} className="flex flex-col gap-1">
              <span className="text-[0.9rem]">
                <span className="font-mono text-cyan">{t("topicN", { n: row.n })}</span> · {topics.get(row.n)}{" "}
                <span className="font-mono text-muted-foreground">
                  ({row.correct}/{row.total})
                </span>
              </span>
              <MasteryBar value={(row.correct / row.total) * 100} label={topics.get(row.n) ?? ""} />
            </li>
          ))}
        </ul>
      </section>

      {weak.length > 0 && (
        <section className="flex flex-col gap-3 rounded-3xl border border-amber/40 bg-amber/5 p-5">
          <h2 className="font-display text-lg font-semibold">{t("mock.review")}</h2>
          <ul className="flex flex-wrap gap-2">
            {weak.map((n) => (
              <li key={n}>
                <Link href={`/olympiad/practice/${n}`} className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
                  {t("topicN", { n })}: {topics.get(n)} →
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-3xl border border-line bg-panel p-5">
        <h2 className="font-display text-lg font-semibold">{t("mock.problems")}</h2>
        <ol className="flex flex-col gap-2">
          {bank.map((p, i) => (
            <li key={p.id} className="flex gap-3 text-[0.9rem]">
              <span className={details.results?.[p.id] ? "text-good" : "text-pink"} aria-label={details.results?.[p.id] ? t("mock.right") : t("mock.wrong")}>
                {details.results?.[p.id] ? "✓" : "✗"}
              </span>
              <span className="line-clamp-2">
                {i + 1}. {p.kk}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
