import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { PeriodicTable } from "@/components/periodic/periodic-table";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("PeriodicTable");
  return { title: t("title") };
}

export default function PeriodicTablePage() {
  const t = useTranslations("PeriodicTable");
  return (
    <div className="page-wrap py-10 md:py-14">
      <Eyebrow>3D Lab</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-6 max-w-[60ch] text-muted-foreground">{t("subtitle")}</p>
      <PeriodicTable />
    </div>
  );
}
