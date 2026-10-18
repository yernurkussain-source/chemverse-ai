import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { LessonStudioDemo } from "./lesson-studio-demo";
import { Section, SectionHead } from "./section";

export function StudioSection() {
  const t = useTranslations("Studio");

  return (
    <Section id="teacher" className="bg-[linear-gradient(180deg,transparent,rgba(255,200,87,.035)_40%,transparent)]">
      <SectionHead eyebrow={t("eyebrow")} title={t("title")} text={t("text")} eyebrowClassName="text-amber" />
      <LessonStudioDemo />
      <Link href="/teacher/lesson-studio" className={`${buttonVariants({ variant: "glow", size: "pill" })} mt-5`}>
        {t("openStudio")}
      </Link>
    </Section>
  );
}
