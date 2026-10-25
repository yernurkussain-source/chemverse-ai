import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/landing/section";
import { MoleculeCatalog } from "@/components/molecules/molecule-catalog";
import { MOLECULES } from "@/lib/chemistry/molecules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MoleculesPage");
  return { title: t("title") };
}

// 3D Lab: молекулалар мен кристалдар каталогы
export default async function MoleculesPage() {
  const t = await getTranslations("MoleculesPage");
  const tAr = await getTranslations("Ar");

  return (
    <div className="page-wrap py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>3D Lab</Eyebrow>
          <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">{t("subtitle", { count: MOLECULES.length })}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/gesture-lab" className={buttonVariants({ variant: "glow", size: "pill-sm" })}>
            {tAr("gestureLink")}
          </Link>
          <Link href="/periodic-table" className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
            {t("periodicLink")}
          </Link>
        </div>
      </div>

      <MoleculeCatalog />
    </div>
  );
}
