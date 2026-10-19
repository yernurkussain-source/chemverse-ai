import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function SiteFooter() {
  const t = useTranslations("Footer");

  return (
    <footer className="border-t border-line py-8 print:hidden text-[0.88rem] text-muted-foreground">
      <div className="page-wrap flex flex-wrap items-center justify-between gap-4">
        <span>
          <b className="text-foreground">CHEMVERSE AI</b> · {t("tagline")}
        </span>
        <Link href="/install" className="font-semibold text-cyan hover:underline">
          {t("install")}
        </Link>
        <span className="rounded-md border border-dashed border-amber px-2 py-0.5 font-mono text-[0.7rem] tracking-[0.06em] text-amber">
          {t("prototype")}
        </span>
      </div>
    </footer>
  );
}
