import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { QrScanner } from "@/components/qr/qr-scanner";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Scan");
  return { title: t("title") };
}

// Телефон камерасымен QR сканерлеу (кадрлар құрылғыда өңделеді)
export default function ScanPage() {
  const t = useTranslations("Scan");
  return (
    <div className="page-wrap py-8 md:py-14">
      <div className="mx-auto max-w-[640px]">
        <BackLink href="/" />
        <Eyebrow>QR</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
        <p className="mt-2 mb-6 text-muted-foreground">{t("subtitle")}</p>
        <QrScanner />
        <p className="mt-6 text-center text-[0.8rem] text-muted-foreground">{t("privacy")}</p>
      </div>
    </div>
  );
}
