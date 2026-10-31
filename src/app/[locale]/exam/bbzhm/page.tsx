import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ExamLanding } from "@/components/exam/exam-landing";
import { BackLink } from "@/components/layout/back-link";
import { Eyebrow } from "@/components/landing/section";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Exam");
  return { title: t("bbzhmTitle") };
}

// ББЖМ (9-сынып): 8–9-сынып химиясы бойынша дайындық тесті
export default function BbzhmPage() {
  const t = useTranslations("Exam");
  return (
    <div className="page-wrap py-10 md:py-14">
      <div className="mx-auto max-w-2xl">
        <BackLink href="/learn" />
        <Eyebrow>BBZhM Smart</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("bbzhmTitle")}</h1>
        <p className="mt-2 mb-8 text-muted-foreground">{t("bbzhmSubtitle")}</p>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <ExamLanding slug="bbzhm-9" />
        </Suspense>
      </div>
    </div>
  );
}
