import { Suspense } from "react";
import type { Metadata } from "next";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { Button, buttonVariants } from "@/components/ui/button";
import { startMock } from "@/features/olympiad/mock-actions";
import { getMyMocks } from "@/features/olympiad/server/mocks";
import { getTeacherId } from "@/features/teacher/queries";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Olympiad.mock");
  return { title: t("title") };
}

// Сынақ олимпиада (OLYMPIAD_SPEC 7-бөлім): мұғалім құрастырған сынақтар — уақытпен, серверде бағаланады
export default function MockListPage() {
  const t = useTranslations("Olympiad");
  return (
    <div className="page-wrap py-6 md:py-10">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        <Link href="/olympiad" className="text-[0.9rem] font-semibold text-cyan hover:underline">
          ← {t("map")}
        </Link>
        <header>
          <Eyebrow>{t("eyebrow")}</Eyebrow>
          <h1 className="mt-2 text-[clamp(1.4rem,3vw,2rem)] font-bold">{t("mock.title")}</h1>
          <p className="mt-1.5 text-muted-foreground">{t("mock.subtitle")}</p>
        </header>
        <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
          <MockList />
        </Suspense>
      </div>
    </div>
  );
}

async function MockList() {
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;
  const [{ userId }, t] = await Promise.all([getTeacherId(), getTranslations("Olympiad")]);
  if (!userId) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-3xl border border-line bg-panel p-6">
        <p>{t("mock.login")}</p>
        <Link href="/login" className={buttonVariants({ variant: "glow", size: "pill" })}>
          {t("login")}
        </Link>
      </div>
    );
  }
  const mocks = await getMyMocks(userId);
  if (!mocks.length) return <p className="rounded-3xl border border-line bg-panel-2 p-6 text-muted-foreground">{t("mock.empty")}</p>;

  return (
    <ul className="flex flex-col gap-3">
      {mocks.map(({ mock, result }) => (
        <li key={mock.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-panel p-5">
          <div className="flex flex-col gap-1">
            <span className="font-display text-[1.05rem] font-semibold">{mock.title}</span>
            <span className="text-[0.85rem] text-muted-foreground">{t("mock.info", { count: mock.config.problems.length, minutes: mock.duration_min })}</span>
          </div>
          {result?.score != null ? (
            <Link href={`/olympiad/mock/${mock.id}`} className={buttonVariants({ variant: "panel", size: "pill-sm" })}>
              {t("mock.resultShort", { score: Number(result.score), max: result.details.max ?? 0 })} →
            </Link>
          ) : result ? (
            <Link href={`/olympiad/mock/${mock.id}`} className={buttonVariants({ variant: "glow", size: "pill-sm" })}>
              {t("mock.continue")} →
            </Link>
          ) : (
            <form action={startMock}>
              <input type="hidden" name="mockId" value={mock.id} />
              <input type="hidden" name="locale" value={locale} />
              <Button type="submit" variant="glow" size="pill-sm">
                {t("mock.start")}
              </Button>
            </form>
          )}
        </li>
      ))}
    </ul>
  );
}
