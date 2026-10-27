import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Section, SectionHead } from "./section";
import { TitrationLab } from "./titration-lab";

export function LabSection() {
  const t = useTranslations("Lab");

  return (
    <Section id="lab" className="bg-[linear-gradient(180deg,transparent,rgba(255,95,162,.04)_40%,transparent)]">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} text={t("text")} eyebrowClassName="text-pink" />
      <TitrationLab />
      <div className="mt-5 flex flex-wrap gap-2.5">
        <Link href="/virtual-lab/titration" className={buttonVariants({ variant: "glow", size: "pill" })}>
          {t("openLab")}
        </Link>
        <Link href="/virtual-lab" className={buttonVariants({ variant: "panel", size: "pill" })}>
          {t("allLabs")}
        </Link>
        <Link href="/game" className={buttonVariants({ variant: "panel", size: "pill" })}>
          {t("game3d")}
        </Link>
      </div>
    </Section>
  );
}
