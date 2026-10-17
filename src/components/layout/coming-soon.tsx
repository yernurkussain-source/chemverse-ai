import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

type PageKey = "learn" | "scan";

/** Әлі жасалмаған бөлімдерге арналған уақытша бет (навигацияда бос батырма болмауы үшін) */
export function ComingSoon({ page, icon }: { page: PageKey; icon: ReactNode }) {
  const t = useTranslations("ComingSoon");

  return (
    <div className="page-wrap py-12 md:py-20">
      <Card className="mx-auto max-w-lg items-center gap-4 rounded-3xl border border-line p-8 text-center ring-0 shadow-[0_1px_2px_var(--shadow)] dark:shadow-none">
        <div className="grid size-16 place-items-center rounded-2xl border border-line bg-panel-2 text-cyan">{icon}</div>
        <Badge variant="outline" className="border-amber font-mono tracking-[0.08em] text-amber uppercase">
          {t("badge")}
        </Badge>
        <h1 className="text-2xl font-bold">{t(`pages.${page}.title`)}</h1>
        <p className="text-muted-foreground">{t(`pages.${page}.text`)}</p>
        <Link href="/" className={buttonVariants({ variant: "panel", size: "pill" })}>
          {t("back")}
        </Link>
      </Card>
    </div>
  );
}
