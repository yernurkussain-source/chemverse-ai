import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScanIcon } from "@/components/layout/nav-icons";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Qr.invalid");
  return { title: t("title") };
}

// QR табылмады, өшірілген немесе мерзімі өткен
export default function InvalidQrPage() {
  const t = useTranslations("Qr.invalid");
  return (
    <div className="page-wrap py-12 md:py-20">
      <Card className="mx-auto max-w-lg items-center gap-4 rounded-3xl border border-line p-8 text-center ring-0 shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
        <div className="grid size-16 place-items-center rounded-2xl border border-line bg-panel-2 text-amber">
          <ScanIcon size={30} />
        </div>
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("text")}</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/scan" className={buttonVariants({ variant: "glow", size: "pill" })}>
            {t("scanAgain")}
          </Link>
          <Link href="/" className={buttonVariants({ variant: "panel", size: "pill" })}>
            {t("home")}
          </Link>
        </div>
      </Card>
    </div>
  );
}
