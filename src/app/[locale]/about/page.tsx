import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { BackLink } from "@/components/layout/back-link";
import { Eyebrow } from "@/components/landing/section";
import { buttonVariants } from "@/components/ui/button";
import { listLessons } from "@/features/lessons/lessons";
import { LAB_CATALOG } from "@/features/virtual-lab/catalog";
import { Link } from "@/i18n/navigation";
import { ELEMENTS } from "@/lib/chemistry/elements";
import { MOLECULES } from "@/lib/chemistry/molecules";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("About");
  return { title: t("title"), description: t("lead") };
}

const SECTIONS = ["problem", "solution", "teacher", "safety", "tech"] as const;

// Жоба туралы: конкурс қазыларына және мектеп әкімшілігіне. Сандар кодтан есептеледі (қолдан жазылмайды)
export default function AboutPage() {
  const t = useTranslations("About");
  const stats = [
    [LAB_CATALOG.length, t("stats.labs")],
    [MOLECULES.length, t("stats.molecules")],
    [ELEMENTS.length, t("stats.elements")],
    [listLessons().length, t("stats.lessons")],
  ] as const;

  return (
    <div className="page-wrap py-10 md:py-14">
      <article className="mx-auto max-w-3xl">
        <BackLink href="/" />
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
        <p className="mt-3 text-lg text-muted-foreground">{t("lead")}</p>

        <dl className="mt-8 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {stats.map(([value, label]) => (
            <div key={label} className="flex flex-col-reverse rounded-2xl border border-line bg-panel-2 p-4">
              <dt className="mt-1 text-[0.82rem] text-muted-foreground">{label}</dt>
              <dd className="m-0 font-mono text-2xl font-semibold text-cyan">{value}</dd>
            </div>
          ))}
        </dl>

        {SECTIONS.map((key) => (
          <section key={key} className="mt-9">
            <h2 className="font-display text-xl font-semibold">{t(`${key}.title`)}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{t(`${key}.text`)}</p>
          </section>
        ))}

        <div className="mt-10 flex flex-wrap gap-2.5">
          <Link href="/demo" className={buttonVariants({ variant: "glow", size: "pill" })}>
            {t("demo")}
          </Link>
          <Link href="/learn" className={buttonVariants({ variant: "panel", size: "pill" })}>
            {t("learn")}
          </Link>
        </div>
      </article>
    </div>
  );
}
