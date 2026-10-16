import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";
import { BookIcon } from "@/components/layout/nav-icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ComingSoon.pages.learn");
  return { title: t("title") };
}

export default function LearnPage() {
  return <ComingSoon page="learn" icon={<BookIcon size={30} />} />;
}
