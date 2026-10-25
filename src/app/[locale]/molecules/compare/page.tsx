import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { MoleculeCompare } from "@/components/molecules/molecule-compare";
import { Link } from "@/i18n/navigation";
import { getMolecule, type MoleculeId } from "@/lib/chemistry/molecules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MoleculesPage.compare");
  return { title: t("title") };
}

type SearchParams = PageProps<"/[locale]/molecules/compare">["searchParams"];

// Изомерлер мен аллотроптарды салыстыру: /molecules/compare?a=butane&b=isobutane
export default function ComparePage({ searchParams }: PageProps<"/[locale]/molecules/compare">) {
  const t = useTranslations("MoleculesPage");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/molecules" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("back")}
      </Link>
      <Eyebrow className="mt-5">3D Lab</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("compare.title")}</h1>
      <p className="mt-2 mb-6 max-w-[65ch] text-muted-foreground">{t("compare.subtitle")}</p>
      <Suspense fallback={<MoleculeCompare initial={["butane", "isobutane"]} />}>
        <CompareWithParams searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function CompareWithParams({ searchParams }: { searchParams: SearchParams }) {
  const { a, b } = await searchParams;
  const id = (value: unknown, fallback: MoleculeId) => (typeof value === "string" && getMolecule(value)?.id) || fallback;
  return <MoleculeCompare initial={[id(a, "butane"), id(b, "isobutane")]} />;
}
