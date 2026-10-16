import { useTranslations } from "next-intl";
import { QrCode } from "@/components/qr/qr-code";
import { LiveClassDemo } from "./live-class-demo";
import { Section, SectionHead } from "./section";

export function LiveSection() {
  const t = useTranslations("Live");

  return (
    <Section id="class">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} text={t("text")} />
      <LiveClassDemo qr={<QrCode value={t("qrValue")} label={t("qrLabel")} />} />
    </Section>
  );
}
