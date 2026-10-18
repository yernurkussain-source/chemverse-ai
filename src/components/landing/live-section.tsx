import { useTranslations } from "next-intl";
import { QrCode } from "@/components/qr/qr-code";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LiveClassDemo } from "./live-class-demo";
import { Section, SectionHead } from "./section";

export function LiveSection() {
  const t = useTranslations("Live");

  return (
    <Section id="class">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} text={t("text")} />
      <LiveClassDemo qr={<QrCode value={t("qrValue")} label={t("qrLabel")} />} />
      <div className="mt-5 flex flex-wrap gap-2">
        <Link href="/teacher/live" className={buttonVariants({ variant: "glow", size: "pill" })}>
          {t("startLive")}
        </Link>
        <Link href="/join" className={buttonVariants({ variant: "panel", size: "pill" })}>
          {t("joinLive")}
        </Link>
      </div>
    </Section>
  );
}
