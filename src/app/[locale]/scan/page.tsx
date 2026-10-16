import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";
import { ScanIcon } from "@/components/layout/nav-icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ComingSoon.pages.scan");
  return { title: t("title") };
}

export default function ScanPage() {
  return <ComingSoon page="scan" icon={<ScanIcon size={30} />} />;
}
