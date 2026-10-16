import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";
import { AtomIcon } from "@/components/layout/nav-icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ComingSoon.pages.molecules");
  return { title: t("title") };
}

export default function MoleculesPage() {
  return <ComingSoon page="molecules" icon={<AtomIcon size={30} />} />;
}
