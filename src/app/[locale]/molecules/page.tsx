import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Eyebrow } from "@/components/landing/section";
import { MOLECULES, molarMass } from "@/lib/chemistry/molecules";
import { formatDecimal } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("MoleculesPage");
  return { title: t("title") };
}

// 3D Lab: 10 молекуланың каталогы
export default async function MoleculesPage() {
  const t = await getTranslations("MoleculesPage");
  const tm = await getTranslations("Molecules");
  const tv = await getTranslations("Viewer");
  const tAr = await getTranslations("Ar");
  const locale = await getLocale();

  return (
    <div className="page-wrap py-10 md:py-14">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>3D Lab</Eyebrow>
          <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
          <p className="mt-2 max-w-[60ch] text-muted-foreground">{t("subtitle")}</p>
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

      <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {MOLECULES.map((m) => (
          <li key={m.id}>
            <Link
              href={`/molecules/${m.id}`}
              className="group flex h-full flex-col gap-2 rounded-[18px] border border-line bg-panel p-5 shadow-[0_1px_2px_var(--shadow)] transition-[border-color,transform] duration-200 hover:-translate-y-0.5 hover:border-cyan-dim dark:shadow-none"
            >
              <span className="font-mono text-2xl font-semibold text-cyan">{m.formula}</span>
              <span className="font-display text-[1.02rem] font-semibold">{tm(`${m.id}.name`)}</span>
              <span className="text-[0.88rem] text-muted-foreground">{tm(`${m.id}.shape`)}</span>
              <span className="mt-auto flex items-center justify-between pt-2 font-mono text-[0.8rem] text-muted-foreground">
                {formatDecimal(molarMass(m.atoms), locale)} {tv("massUnit")}
                <span className="font-sans font-semibold text-cyan group-hover:underline">{t("open")} →</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
