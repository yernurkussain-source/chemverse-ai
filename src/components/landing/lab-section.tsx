import { useTranslations } from "next-intl";
import { Section, SectionHead } from "./section";
import { TitrationLab } from "./titration-lab";

export function LabSection() {
  const t = useTranslations("Lab");

  return (
    <Section id="lab" className="bg-[linear-gradient(180deg,transparent,rgba(255,95,162,.04)_40%,transparent)]">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} text={t("text")} eyebrowClassName="text-pink" />
      <TitrationLab />
    </Section>
  );
}
