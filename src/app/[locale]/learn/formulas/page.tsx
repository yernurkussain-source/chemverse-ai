import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { BackLink } from "@/components/layout/back-link";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Formulas");
  return { title: t("title") };
}

// ҰБТ спецификациясының бөлімдері бойынша; мәтіндері мен формулалары — messages → Formulas
const SECTIONS = [
  ["general", ["amount", "particles", "gasVolume", "relDensity", "elementFraction", "avgMolar"]],
  ["solutions", ["massFraction", "density", "molarity", "mixing", "solubility"]],
  ["reactions", ["yield", "impurity", "heat", "hess"]],
  ["kinetics", ["rate", "massAction", "vantHoff"]],
  ["ions", ["ph", "faraday"]],
  ["organic", ["homologous", "combustion", "polymer"]],
] as const;

// Формулалар анықтамасы: формула, таңбалардың мағынасы мен өлшем бірлігі, шешілген мысал
export default function FormulasPage() {
  const t = useTranslations("Formulas");
  return (
    <div className="page-wrap py-10 md:py-14">
      <BackLink href="/learn" />
      <Eyebrow>{t("eyebrow")}</Eyebrow>
      <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
      <p className="mt-2 mb-6 max-w-[60ch] text-muted-foreground">{t("subtitle")}</p>

      <nav aria-label={t("sectionsNav")} className="mb-8">
        <ul className="flex flex-wrap gap-2">
          {SECTIONS.map(([section]) => (
            <li key={section}>
              <a href={`#${section}`} className="block rounded-full border border-line bg-panel-2 px-3 py-1.5 text-[0.85rem] hover:border-cyan-dim">
                {t(`sections.${section}`)}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {SECTIONS.map(([section, ids]) => (
        <section key={section} id={section} aria-labelledby={`${section}-title`} className="mb-10 scroll-mt-24">
          <h2 id={`${section}-title`} className="mb-3 font-display text-lg font-semibold">
            {t(`sections.${section}`)}
          </h2>
          <ul className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {ids.map((id) => (
              <li key={id} className="flex flex-col rounded-[18px] border border-line bg-panel p-5 shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
                <h3 className="text-[0.95rem] font-semibold">{t(`items.${id}.name`)}</h3>
                <p className="my-3 rounded-xl bg-panel-2 px-3.5 py-2.5 font-mono text-[1.05rem] font-semibold text-cyan">
                  {t(`items.${id}.formula`)}
                </p>
                <ul className="flex flex-col gap-1 text-[0.88rem] text-muted-foreground">
                  {t(`items.${id}.vars`)
                    .split("\n")
                    .map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                </ul>
                <p className="mt-3 border-t border-line pt-3 text-[0.88rem]">
                  <span className="font-semibold">{t("example")}:</span> {t(`items.${id}.example`)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
