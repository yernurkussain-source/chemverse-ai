import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { LabResult } from "@/components/virtual-lab/lab-result";
import { isShellLab } from "@/features/virtual-lab/catalog";
import { getAttempt } from "@/features/virtual-lab/queries";
import { Link } from "@/i18n/navigation";

// Әрекет id-і алдын ала белгісіз — бет тек сұраныс кезінде сызылады
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ChemLab.resultPage");
  return { title: t("title") };
}

type Params = PageProps<"/[locale]/virtual-lab/[slug]/result/[attemptId]">["params"];

// Нәтиже беті: ұпай (100-ден), критерийлер, кері байланыс. Тек иесі не оның мұғалімі көреді (RLS)
export default function LabResultPage({ params }: PageProps<"/[locale]/virtual-lab/[slug]/result/[attemptId]">) {
  const t = useTranslations("ChemLab");
  return (
    <div className="page-wrap py-8 md:py-12">
      <div className="mx-auto max-w-3xl">
        <Suspense fallback={<p className="text-muted-foreground">…</p>}>
          <ResultContent params={params} />
        </Suspense>
        <Link href="/virtual-lab" className="mt-8 inline-block text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("back")}
        </Link>
      </div>
    </div>
  );
}

async function ResultContent({ params }: { params: Params }) {
  const { slug, attemptId } = await params;
  const attempt = isShellLab(slug) ? await getAttempt(slug, attemptId) : null;
  if (!attempt || !isShellLab(attempt.lab.slug)) notFound();
  const t = await getTranslations("ChemLab");

  return (
    <>
      <Eyebrow>{attempt.own ? t("resultPage.title") : t("resultPage.studentWork")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.5rem,3.2vw,2.2rem)] font-bold">
        <Link href={`/virtual-lab/${attempt.lab.slug}`} className="hover:underline">
          {t(`catalog.${attempt.lab.slug}.title`)}
        </Link>
      </h1>
      <p className="mt-1.5 mb-6 font-mono text-[0.85rem] text-muted-foreground">
        {t("resultPage.date", { date: attempt.createdAt.slice(0, 10) })}
        {attempt.durationSec !== null && ` · ${t("scoreView.duration", { min: Math.max(1, Math.round(attempt.durationSec / 60)) })}`}
      </p>
      <LabResult
        slug={attempt.lab.slug}
        outcome={{ breakdown: attempt.breakdown, feedback: attempt.feedback, reveal: attempt.reveal }}
        conclusion={attempt.conclusion}
      />
    </>
  );
}
