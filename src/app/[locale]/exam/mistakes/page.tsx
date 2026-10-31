import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ReviewList } from "@/components/exam/review-list";
import { BackLink } from "@/components/layout/back-link";
import { Eyebrow } from "@/components/landing/section";
import { buttonVariants } from "@/components/ui/button";
import { getMistakes } from "@/features/exam/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Exam");
  return { title: t("mistakesTitle") };
}

// Қателер дәптері: ҰБТ/ББЖМ тесттеріндегі әлі түзетілмеген қателер (олимпиаданікі — /olympiad/mistakes)
export default function ExamMistakesPage() {
  const t = useTranslations("Exam");
  return (
    <div className="page-wrap py-10 md:py-14">
      <div className="mx-auto max-w-3xl">
        <BackLink href="/exam/unt">{t("untShort")}</BackLink>
        <Eyebrow>UNT Master</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("mistakesTitle")}</h1>
        <p className="mt-2 mb-8 text-muted-foreground">{t("mistakesSubtitle")}</p>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <MistakesContent />
        </Suspense>
      </div>
    </div>
  );
}

async function MistakesContent() {
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const t = await getTranslations("Exam");
  const items = await getMistakes(locale);
  if (items === null) {
    redirect({ href: "/login", locale });
    return null;
  }
  if (!items.length) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-panel p-5">
        <p>{t("mistakesEmpty")}</p>
        <Link href="/exam/unt" className={buttonVariants({ variant: "glow", size: "pill-sm" })}>
          {t("start")}
        </Link>
      </div>
    );
  }
  return <ReviewList items={items} numbered={false} />;
}
