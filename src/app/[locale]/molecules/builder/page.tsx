import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { MoleculeBuilder } from "@/components/molecules/molecule-builder";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MoleculesPage.builder");
  return { title: t("title") };
}

// Молекула құрастырушы: атомдар мен байланыстардан молекула жасап, затты тану
export default function BuilderPage() {
  const t = useTranslations("MoleculesPage");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/molecules" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("back")}
      </Link>
      <Eyebrow className="mt-5">3D Lab</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("builder.title")}</h1>
      <p className="mt-2 mb-6 max-w-[65ch] text-muted-foreground">{t("builder.subtitle")}</p>
      <MoleculeBuilder />
    </div>
  );
}
