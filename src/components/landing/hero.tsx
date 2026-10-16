import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { Eyebrow } from "./section";
import { MoleculePlaceholder } from "./molecule-placeholder";

const TAGS = ["languages", "platforms", "ar", "exams"] as const;

export function Hero() {
  const t = useTranslations("Hero");

  return (
    <section className="relative overflow-hidden pt-9 pb-6 lg:pt-14 lg:pb-10">
      {/* Оң жақ жоғарыдағы көгілдір жарқыл */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-[20%] -right-[10%] size-[720px] bg-[radial-gradient(closest-side,var(--glow-soft),transparent_70%)]"
      />
      <div className="page-wrap relative grid items-center gap-10 lg:grid-cols-[1.05fr_1fr]">
        <div className="min-w-0">
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="mt-3.5 text-[clamp(2rem,5.2vw,3.7rem)] font-extrabold">
            {t.rich("titleLine1", {
              em: (chunks) => (
                <em className="text-cyan not-italic [text-shadow:0_0_30px_var(--glow-soft)]">{chunks}</em>
              ),
            })}
            <br />
            {t("titleLine2")}
            <br />
            {t("titleLine3")}
          </h1>
          <p className="mt-5 max-w-[56ch] text-[1.08rem] text-foreground-2">{t("lead")}</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/#lab" className={buttonVariants({ variant: "glow", size: "pill" })}>
              {t("ctaLab")}
              <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </Link>
            <Link href="/#teacher" className={buttonVariants({ variant: "panel", size: "pill" })}>
              {t("ctaTeacher")}
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className="h-auto rounded-full border-line px-2.5 py-1 font-mono text-[0.72rem] font-normal tracking-[0.06em] text-muted-foreground"
              >
                {t(`tags.${tag}`)}
              </Badge>
            ))}
          </div>
        </div>

        <MoleculePlaceholder />
      </div>
    </section>
  );
}
