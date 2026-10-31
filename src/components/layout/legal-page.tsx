import { useTranslations } from "next-intl";
import { BackLink } from "@/components/layout/back-link";
import { Eyebrow } from "@/components/landing/section";

/** Бөлімдердің реті (мәтіндері — messages → Legal.<doc>.<key>.title|text) */
export const LEGAL_SECTIONS = {
  privacy: ["collect", "purpose", "camera", "ai", "storage", "minors", "rights", "contact"],
  terms: ["purpose", "ai", "labs", "accounts", "conduct", "changes"],
} as const;

/** Құпиялық саясаты / пайдалану шарттары: қысқа, оқушыға түсінікті тілмен */
export function LegalPage({ doc }: { doc: keyof typeof LEGAL_SECTIONS }) {
  const t = useTranslations("Legal");
  const sections =
    doc === "privacy"
      ? LEGAL_SECTIONS.privacy.map((key) => [t(`privacy.${key}.title`), t(`privacy.${key}.text`)])
      : LEGAL_SECTIONS.terms.map((key) => [t(`terms.${key}.title`), t(`terms.${key}.text`)]);
  return (
    <div className="page-wrap py-10 md:py-14">
      <article className="mx-auto max-w-2xl">
        <BackLink href="/" />
        <Eyebrow>CHEMVERSE AI</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t(`${doc}Title`)}</h1>
        <p className="mt-2 text-[0.85rem] text-muted-foreground">{t("updated")}</p>
        <p className="mt-4 rounded-2xl border border-line bg-panel-2 p-4 text-[0.92rem]">{t("note")}</p>
        {sections.map(([title, text]) => (
          <section key={title} className="mt-7">
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="mt-2 leading-relaxed text-muted-foreground">{text}</p>
          </section>
        ))}
      </article>
    </div>
  );
}
