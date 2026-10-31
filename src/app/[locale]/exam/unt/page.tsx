import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ExamLanding } from "@/components/exam/exam-landing";
import { BackLink } from "@/components/layout/back-link";
import { Eyebrow } from "@/components/landing/section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Exam");
  return { title: t("untTitle") };
}

// ҰБТ режимі: тест туралы ақпарат және «Бастау»
export default function UntPage() {
  const t = useTranslations("Exam");
  return (
    <div className="page-wrap py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <BackLink href="/learn" />
        <Eyebrow>UNT Master</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("untTitle")}</h1>
        <p className="mt-2 mb-8 text-muted-foreground">{t("untSubtitle")}</p>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <ExamLanding slug="unt-demo" />
        </Suspense>
      </div>
    </div>
  );
}
