import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Markdown } from "@/components/ai/markdown";
import { BackLink } from "@/components/layout/back-link";
import { Eyebrow } from "@/components/landing/section";
import { buttonVariants } from "@/components/ui/button";
import { getLesson, lessonText, listLessons } from "@/features/lessons/lessons";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export function generateStaticParams() {
  return listLessons().map(({ slug }) => ({ slug }));
}

async function currentLocale(): Promise<Locale> {
  const value = await rootLocale();
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

export async function generateMetadata({ params }: PageProps<"/[locale]/learn/[slug]">): Promise<Metadata> {
  const lesson = getLesson((await params).slug);
  return lesson ? { title: lesson.title[await currentLocale()] } : {};
}

type Params = PageProps<"/[locale]/learn/[slug]">["params"];

// Оқулық тарауының конспектісі (docs/rag) + AI мұғалімге сұрақ, тест, келесі тарау
export default function LessonPage({ params }: PageProps<"/[locale]/learn/[slug]">) {
  const t = useTranslations("Exam");
  return (
    <div className="page-wrap py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <BackLink href="/learn" />
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <LessonContent params={params} />
        </Suspense>
      </div>
    </div>
  );
}

async function LessonContent({ params }: { params: Params }) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const locale = await currentLocale();
  const t = await getTranslations("Lessons");
  const all = listLessons();
  const index = all.findIndex((l) => l.slug === slug);
  const [prev, next] = [all[index - 1], all[index + 1]];
  const title = lesson.title[locale];
  const askAi = { pathname: "/ai-tutor", query: { q: t("aiPrompt", { title: lesson.title.kk.replace(/^\d+ · /, "") }) } };

  return (
    <article className="flex flex-col gap-6">
      <header>
        <Eyebrow>{t("grade", { grade: lesson.grade })}</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.5rem,3.2vw,2.2rem)] font-bold">{title.replace(/^\d+ · /, "")}</h1>
        {locale !== "kk" && <p className="mt-2 text-[0.88rem] text-muted-foreground">{t("kkOnly")}</p>}
      </header>

      <div className="flex flex-wrap gap-2">
        <Link href={askAi} className={buttonVariants({ variant: "glow", size: "pill-sm" })}>
          {t("askAi")}
        </Link>
        <Link href="/exam/unt" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
          {t("test")}
        </Link>
      </div>

      <div className="rounded-3xl border border-line bg-panel p-5 sm:p-7" lang="kk">
        <Markdown>{lessonText(lesson)}</Markdown>
      </div>

      <nav aria-label={t("chapters")} className="flex flex-wrap justify-between gap-3 text-[0.9rem] font-semibold">
        {prev ? (
          <Link href={`/learn/${prev.slug}`} className="text-cyan hover:underline">
            ← {prev.title[locale]}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/learn/${next.slug}`} className="text-right text-cyan hover:underline">
            {next.title[locale]} →
          </Link>
        )}
      </nav>
    </article>
  );
}
