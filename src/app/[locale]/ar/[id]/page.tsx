import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { ArViewer } from "@/components/ar/ar-viewer";
import { Link } from "@/i18n/navigation";
import { getMolecule, MOLECULES } from "@/lib/chemistry/molecules";

export function generateStaticParams() {
  return MOLECULES.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/ar/[id]">): Promise<Metadata> {
  const { id } = await params;
  const molecule = getMolecule(id);
  if (!molecule) return {};
  const t = await getTranslations("Ar");
  const tm = await getTranslations("Molecules");
  return { title: t("title", { name: tm(`${molecule.id}.name`) }) };
}

type Params = PageProps<"/[locale]/ar/[id]">["params"];

// QR → AR: молекуланы телефон камерасы арқылы үстелге «қою» (BLUEPRINT 10.3)
export default function ArPage({ params }: PageProps<"/[locale]/ar/[id]">) {
  const t = useTranslations("MoleculesPage");
  const tViewer = useTranslations("MoleculeViewer");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/molecules" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("back")}
      </Link>
      <Suspense fallback={<p className="mt-5 text-muted-foreground">{tViewer("loading")}</p>}>
        <ArContent params={params} />
      </Suspense>
    </div>
  );
}

async function ArContent({ params }: { params: Params }) {
  const { id } = await params;
  const molecule = getMolecule(id);
  if (!molecule) notFound();
  const t = await getTranslations("Ar");
  const tm = await getTranslations("Molecules");
  const name = tm(`${molecule.id}.name`);

  return (
    <>
      <p className="mt-5 font-mono text-2xl font-semibold text-cyan">{molecule.formula}</p>
      <h1 className="mt-1 text-[clamp(1.5rem,3vw,2.2rem)] font-bold">{t("title", { name })}</h1>
      <p className="mt-2 mb-6 max-w-[60ch] text-muted-foreground">{t("subtitle")}</p>
      <ArViewer glb={`/molecules/glb/${molecule.id}.glb`} name={name} />
    </>
  );
}
