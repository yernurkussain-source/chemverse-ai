import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { GestureLab } from "@/components/gesture/gesture-lab";
import { Eyebrow } from "@/components/landing/section";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("GestureLab");
  return { title: t("title") };
}

export default function GestureLabPage() {
  const t = useTranslations("GestureLab");
  const tm = useTranslations("MoleculesPage");
  return (
    <div className="page-wrap py-8 md:py-12">
      <BackLink href="/molecules">{tm("back")}</BackLink>
      <Eyebrow>3D Lab</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-6 max-w-[64ch] text-muted-foreground">{t("subtitle")}</p>
      <GestureLab />
    </div>
  );
}
