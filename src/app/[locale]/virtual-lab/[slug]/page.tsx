import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { buttonVariants } from "@/components/ui/button";
import { MyWorks } from "@/components/virtual-lab/catalog-cards";
import { LabShell } from "@/components/virtual-lab/lab-shell";
import { getLab, isShellLab, LAB_CATALOG, labHref } from "@/features/virtual-lab/catalog";
import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return LAB_CATALOG.map((lab) => ({ slug: lab.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/virtual-lab/[slug]">): Promise<Metadata> {
  const lab = getLab((await params).slug);
  if (!lab) return {};
  const t = await getTranslations("ChemLab");
  return { title: `${t(`catalog.${lab.slug}.title`)} · ChemLab`, description: t(`catalog.${lab.slug}.work`) };
}

type Params = PageProps<"/[locale]/virtual-lab/[slug]">["params"];

// Тәжірибе беті: 8 қадамдық LabShell (дайын тәжірибе) немесе «Жақында»
export default function LabPage({ params }: PageProps<"/[locale]/virtual-lab/[slug]">) {
  const t = useTranslations("ChemLab");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/virtual-lab" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("back")}
      </Link>
      <Suspense fallback={null}>
        <LabContent params={params} />
      </Suspense>
    </div>
  );
}

async function LabContent({ params }: { params: Params }) {
  const lab = getLab((await params).slug);
  if (!lab) notFound();
  const t = await getTranslations("ChemLab");

  // Сілтеме түріндегі тәжірибе (периодтық кесте) — өз бетіне
  if ("href" in lab) {
    const value = await rootLocale();
    redirect({ href: labHref(lab), locale: hasLocale(routing.locales, value) ? value : routing.defaultLocale });
  }

  const header = (
    <>
      <Eyebrow className="mt-5">
        {t(`catalog.${lab.slug}.topic`)} · {lab.grades.map((grade) => t("grade", { grade })).join(", ")}
      </Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.5rem,3.2vw,2.2rem)] font-bold">{t(`catalog.${lab.slug}.title`)}</h1>
      <p className="mt-2 mb-6 max-w-[62ch] text-muted-foreground">
        {t(`catalog.${lab.slug}.work`)} <span className="text-[0.85rem]">◇ {t("modelNote")}</span>
      </p>
    </>
  );

  if (!isShellLab(lab.slug)) {
    return (
      <>
        {header}
        <div className="rounded-3xl border border-dashed border-line bg-panel p-6">
          <p className="font-display text-lg font-semibold">🔒 {t("soonTitle")}</p>
          <p className="mt-1.5 text-muted-foreground">{t("soonText", { title: t(`catalog.${lab.slug}.title`) })}</p>
          <Link href="/virtual-lab" className={`${buttonVariants({ variant: "panel", size: "pill-sm" })} mt-4`}>
            ← {t("back")}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <LabShell slug={lab.slug} />
      <Suspense fallback={null}>
        <MyWorks slug={lab.slug} />
      </Suspense>
    </>
  );
}
