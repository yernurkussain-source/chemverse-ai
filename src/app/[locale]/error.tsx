"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { LogoMark } from "@/components/layout/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

// Беттегі күтпеген қате (сервер не браузер): түсінікті хабар + «Қайта көру». Мәтіндер — not-found.tsx-тегідей
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const t = useTranslations("ErrorPage");
  const tn = useTranslations("NotFound");
  // Сервер қатесінің digest-і Vercel журналындағы жазбаны табуға көмектеседі
  const digest = error instanceof Error && "digest" in error ? String(error.digest) : null;

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="page-wrap flex flex-col items-center gap-4 py-16 text-center md:py-24">
      <LogoMark size={56} />
      <h1 className="text-[clamp(1.5rem,3.2vw,2.3rem)] font-bold">{t("title")}</h1>
      <p className="max-w-[48ch] text-muted-foreground">{t("text")}</p>
      <div className="flex flex-wrap justify-center gap-2.5">
        <Button variant="glow" size="pill" onClick={() => retry()}>
          {t("retry")}
        </Button>
        <Link href="/" className={buttonVariants({ variant: "panel", size: "pill" })}>
          {tn("back")}
        </Link>
      </div>
      {digest && <p className="font-mono text-[0.75rem] text-muted-foreground">{t("code", { digest })}</p>}
    </div>
  );
}
