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

// Ұлттық тестілеу орталығы: химия спецификациясы (2026 жылдан) және ресми үлгілік тест
const SPEC_URL = "https://testcenter.kz/wp-content/uploads/2025/11/13_Химия_каз.pdf";
const SAMPLE_URL = "https://testcenter.kz/wp-content/uploads/2025/06/Химия.pdf";

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
        {/* Карточка жүктелгенше орны сақталады — астындағы «Дереккөз» блогы секірмеуі үшін (CLS) */}
        <Suspense fallback={<p className="min-h-svh text-muted-foreground">{t("loading")}</p>}>
          <ExamLanding slug="unt-demo" />
        </Suspense>

        {/* Дәлдік: пішім ресми ҰТО құжатынан, сұрақтар — авторлық (нақты ҰБТ-да кездесті деп белгіленбейді) */}
        <section className="mt-6 rounded-3xl border border-line bg-panel p-5 text-[0.88rem] text-muted-foreground">
          <h2 className="mb-2 font-display text-base font-semibold text-foreground">{t("source.title")}</h2>
          <p>{t("source.spec")}</p>
          <p className="mt-1.5">{t("source.authored")}</p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 font-semibold">
            <li>
              <a href={SPEC_URL} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">
                {t("source.specLink")} ↗
              </a>
            </li>
            <li>
              <a href={SAMPLE_URL} target="_blank" rel="noopener noreferrer" className="text-cyan hover:underline">
                {t("source.sampleLink")} ↗
              </a>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
