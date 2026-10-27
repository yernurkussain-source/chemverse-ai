import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { Game3DCard, GradeCard, LabCard, MyWorks } from "@/components/virtual-lab/catalog-cards";
import { FEATURED_LABS, getLab, LAB_GRADES } from "@/features/virtual-lab/catalog";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ChemLab");
  return { title: t("title"), description: t("subtitle") };
}

// ChemLab басты беті (docs/chemlab/CHEMLAB_SPEC.md 2-бөлім): ұран, 7–10-сынып карталары, ұсынылатын тәжірибелер, менің жұмыстарым
export default function ChemLabPage() {
  const t = useTranslations("ChemLab");
  const featured = FEATURED_LABS.map((slug) => getLab(slug)!);
  return (
    <div className="page-wrap py-8 md:py-12">
      <BackLink href="/learn" />
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 font-display text-lg font-semibold text-cyan">{t("slogan")}</p>
      <p className="mt-2 max-w-[62ch] text-muted-foreground">{t("subtitle")}</p>
      <p className="mt-3 max-w-[62ch] rounded-2xl border border-line bg-panel-2/60 px-4 py-2.5 text-[0.85rem] text-muted-foreground">
        ◇ {t("modelNote")}
      </p>
      <Game3DCard />

      <h2 className="mt-9 mb-3.5 font-display text-xl font-semibold">{t("gradesTitle")}</h2>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {LAB_GRADES.map((grade) => (
          <li key={grade}>
            <GradeCard grade={grade} />
          </li>
        ))}
      </ul>

      <h2 className="mt-10 mb-3.5 font-display text-xl font-semibold">{t("readyTitle")}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((lab) => (
          <li key={lab.slug}>
            <LabCard lab={lab} />
          </li>
        ))}
      </ul>

      <Suspense fallback={null}>
        <MyWorks />
      </Suspense>
    </div>
  );
}
