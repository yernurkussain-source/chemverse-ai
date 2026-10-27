import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { InstallGuide } from "@/components/install/install-guide";
import { Eyebrow } from "@/components/landing/section";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Install");
  return { title: t("title") };
}

// Қосымшаны орнату: iPhone (Басты экранға қосу), Android (APK), компьютер (QR)
export default function InstallPage() {
  const t = useTranslations("Install");
  return (
    <div className="page-wrap py-10 md:py-14">
      <div className="mx-auto max-w-xl">
        <BackLink href="/" />
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
        <p className="mt-2 mb-6 text-muted-foreground">{t("subtitle")}</p>
        <InstallGuide />
      </div>
    </div>
  );
}
