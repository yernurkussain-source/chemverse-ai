import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/logo";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <div className="page-wrap flex flex-col items-center gap-4 py-16 text-center md:py-24">
      <LogoMark size={56} />
      <p className="font-mono text-sm tracking-[0.14em] text-cyan">404</p>
      <h1 className="text-[clamp(1.5rem,3.2vw,2.3rem)] font-bold">{t("title")}</h1>
      <p className="max-w-[48ch] text-muted-foreground">{t("text")}</p>
      <Link href="/" className={buttonVariants({ variant: "glow", size: "pill" })}>
        {t("back")}
      </Link>
    </div>
  );
}
