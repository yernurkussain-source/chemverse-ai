import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { MoleculeDetailViewer } from "@/components/molecules/molecule-detail-viewer";
import { getElement } from "@/lib/chemistry/elements";
import { getMolecule, MOLECULES, molarMass } from "@/lib/chemistry/molecules";
import { formatDecimal, formatShort } from "@/lib/format";

export function generateStaticParams() {
  return MOLECULES.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }: PageProps<"/[locale]/molecules/[id]">): Promise<Metadata> {
  const { id } = await params;
  const molecule = getMolecule(id);
  if (!molecule) return {};
  const tm = await getTranslations("Molecules");
  return { title: `${tm(`${molecule.id}.name`)} (${molecule.formula})`, description: tm(`${molecule.id}.description`) };
}

type Params = PageProps<"/[locale]/molecules/[id]">["params"];

// Бір молекуланың беті: үлкен 3D көрініс және деректер
export default function MoleculePage({ params }: PageProps<"/[locale]/molecules/[id]">) {
  const t = useTranslations("MoleculesPage");
  const tViewer = useTranslations("MoleculeViewer");
  return (
    <div className="page-wrap py-8 md:py-12">
      <Link href="/molecules" className="text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("back")}
      </Link>
      {/* URL-дегі молекула нөмірін оқитын бөлік — бет ауысқанда бірден ашылуы үшін Suspense ішінде */}
      <Suspense fallback={<p className="mt-5 text-muted-foreground">{tViewer("loading")}</p>}>
        <MoleculeContent params={params} />
      </Suspense>
    </div>
  );
}

async function MoleculeContent({ params }: { params: Params }) {
  const { id } = await params;
  const molecule = getMolecule(id);
  if (!molecule) notFound();

  const locale = await getLocale();
  const t = await getTranslations("MoleculesPage");
  const tm = await getTranslations("Molecules");
  const tv = await getTranslations("Viewer");
  const tAr = await getTranslations("Ar");
  const angle = `${molecule.angle.approx ? "≈" : ""}${formatShort(molecule.angle.degrees, locale)}°`;

  return (
    <>
      <div className="mt-5 grid items-start gap-8 lg:grid-cols-[1.1fr_1fr]">
        <MoleculeDetailViewer id={molecule.id} />

        <div className="flex min-w-0 flex-col gap-5">
          <div>
            <p className="font-mono text-3xl font-semibold text-cyan">{molecule.formula}</p>
            <h1 className="mt-1 text-[clamp(1.5rem,3vw,2.2rem)] font-bold">{tm(`${molecule.id}.name`)}</h1>
            <p className="mt-3 text-foreground-2">{tm(`${molecule.id}.description`)}</p>
          </div>

          <dl className="m-0 grid grid-cols-2 gap-2.5">
            <Fact label={tv("facts.mass")} value={`${formatDecimal(molarMass(molecule.atoms), locale)} ${tv("massUnit")}`} />
            <Fact label={tv("facts.angle")} value={angle} />
            <Fact label={tv("facts.shape")} value={tm(`${molecule.id}.shape`)} wide />
          </dl>

          <section>
            <h2 className="text-base font-semibold">{t("composition")}</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {Object.entries(molecule.atoms).map(([symbol, count]) => {
                const element = getElement(symbol);
                return (
                  <li key={symbol} className="rounded-xl border border-line bg-panel px-3 py-2 text-[0.9rem]">
                    <b className="mr-1.5 font-mono text-cyan">{symbol}</b>
                    {element?.name[locale]} × {count}
                  </li>
                );
              })}
            </ul>
          </section>

          <div className="flex flex-wrap gap-2.5">
            <Link href={`/ar/${molecule.id}`} className={buttonVariants({ variant: "glow", size: "pill" })}>
              {tAr("openAr")}
            </Link>
            <Link href="/gesture-lab" className={buttonVariants({ variant: "panel", size: "pill" })}>
              {tAr("gestureLink")}
            </Link>
          </div>

          <p className="font-mono text-[0.78rem] text-muted-foreground">
            {molecule.pubchemCid ? t("source", { cid: molecule.pubchemCid }) : t("sourceGenerated")}
          </p>
        </div>
      </div>
    </>
  );
}

function Fact({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`min-w-0 rounded-xl bg-panel-2 px-3.5 py-2.5 ${wide ? "col-span-2" : ""}`}>
      <dt className="font-mono text-[0.72rem] tracking-[0.04em] text-muted-foreground">{label}</dt>
      <dd className="m-0 font-semibold">{value}</dd>
    </div>
  );
}
