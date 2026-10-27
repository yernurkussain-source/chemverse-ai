import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { PeriodicTable } from "@/components/periodic/periodic-table";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PeriodicTable");
  return { title: t("title") };
}

type SearchParams = PageProps<"/[locale]/periodic-table">["searchParams"];

export default function PeriodicTablePage({ searchParams }: PageProps<"/[locale]/periodic-table">) {
  const t = useTranslations("PeriodicTable");
  return (
    <div className="page-wrap py-10 md:py-14">
      <BackLink href="/learn" />
      <Eyebrow>3D Lab</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-6 max-w-[60ch] text-muted-foreground">{t("subtitle")}</p>
      <Suspense fallback={<PeriodicTable />}>
        <TableWithSelection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

// Элемент QR-ы: /periodic-table?el=Na — натрий бірден таңдалып тұрады
async function TableWithSelection({ searchParams }: { searchParams: SearchParams }) {
  const { el } = await searchParams;
  return <PeriodicTable initialSymbol={typeof el === "string" ? el : undefined} />;
}
