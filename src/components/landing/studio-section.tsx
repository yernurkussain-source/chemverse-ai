import { useTranslations } from "next-intl";
import { LessonStudioDemo } from "./lesson-studio-demo";
import { Section, SectionHead } from "./section";

export function StudioSection() {
  const t = useTranslations("Studio");

  return (
    <Section id="teacher" className="bg-[linear-gradient(180deg,transparent,rgba(255,200,87,.035)_40%,transparent)]">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} text={t("text")} eyebrowClassName="text-amber" />
      <LessonStudioDemo />
    </Section>
  );
}
