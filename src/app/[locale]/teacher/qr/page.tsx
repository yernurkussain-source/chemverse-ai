import { Suspense } from "react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Eyebrow } from "@/components/landing/section";
import { PrintButton } from "@/components/qr/print-button";
import { QrCode } from "@/components/qr/qr-code";
import { QrCreateForm } from "@/components/qr/qr-create-form";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toggleQr } from "@/features/qr/actions";
import { isQrType, type QrResource, type QrType } from "@/features/qr/types";
import { getCurrentAccount } from "@/features/auth/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { getElement } from "@/lib/chemistry/elements";
import { getMolecule } from "@/lib/chemistry/molecules";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Qr");
  return { title: t("title") };
}

// Мұғалімнің QR генераторы және басып шығару беті (BLUEPRINT 6-бөлім)
export default function TeacherQrPage() {
  const t = useTranslations("Qr");
  return (
    <div className="page-wrap py-10 md:py-14 print:py-0">
      <div className="print:hidden">
        <Eyebrow>{t("eyebrow")}</Eyebrow>
        <h1 className="mt-2.5 text-[clamp(1.6rem,3.4vw,2.4rem)] font-bold">{t("title")}</h1>
        <p className="mt-2 mb-8 max-w-[60ch] text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <TeacherQrContent />
      </Suspense>
    </div>
  );
}

async function currentLocale(): Promise<Locale> {
  const value = await rootLocale();
  return hasLocale(routing.locales, value) ? value : routing.defaultLocale;
}

/** QR ішіне жазылатын толық адрес (мысалы https://chemverse.app/q/Ab3dEf7h) */
async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function TeacherQrContent() {
  const locale = await currentLocale();
  const t = await getTranslations("Qr");
  const account = await getCurrentAccount();
  if (!account) {
    redirect({ href: "/login", locale });
    return null;
  }

  if (account.profile?.role !== "teacher") {
    return (
      <Card className="max-w-xl gap-3 rounded-3xl border border-amber/50 bg-amber/10 p-6 ring-0">
        <p>{t("teachersOnly")}</p>
        <Link href="/demo" className={cn(buttonVariants({ variant: "panel", size: "pill-sm" }), "self-start")}>
          {t("teacherDemo")}
        </Link>
      </Card>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("qr_resources")
    .select("id, token, type, target, scan_count, is_active, expires_at, created_at")
    .order("created_at", { ascending: false })
    .returns<QrResource[]>();
  const items = (data ?? []).filter((qr) => isQrType(qr.type));
  const origin = await siteOrigin();

  return (
    <div className="grid gap-8 lg:grid-cols-[340px_1fr] print:block">
      <Card className="h-fit gap-4 rounded-3xl border border-line p-5 ring-0 shadow-[0_1px_2px_var(--shadow)] sm:p-6 dark:shadow-none print:hidden">
        <h2 className="font-display text-lg font-semibold">{t("newTitle")}</h2>
        <QrCreateForm />
      </Card>

      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <h2 className="font-display text-lg font-semibold">{t("listTitle", { count: items.length })}</h2>
          {items.some((qr) => qr.is_active) && <PrintButton label={t("print")} />}
        </div>
        {items.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-6 text-center text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3 print:grid-cols-3 print:gap-4">
            {items.map((qr) => (
              <QrCard key={qr.id} qr={qr} url={`${origin}/q/${qr.token}`} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

async function QrCard({ qr, url }: { qr: QrResource; url: string }) {
  const t = await getTranslations("Qr");
  const { title, subtitle } = await describeTarget(qr.type, qr.target);

  return (
    <li
      className={cn(
        "flex flex-col items-center gap-2 rounded-[18px] border border-line bg-panel p-4 text-center print:break-inside-avoid print:border-black print:bg-white print:text-black",
        !qr.is_active && "opacity-60 print:hidden",
      )}
    >
      <span className="text-[0.75rem] font-semibold tracking-[0.06em] text-cyan uppercase print:text-black">
        {t(`types.${qr.type}`)}
      </span>
      <QrCode value={url} label={t("qrLabel", { name: title })} size={168} className="rounded-lg" />
      <span className="font-mono text-xl font-semibold">{title}</span>
      {subtitle && <span className="-mt-1 text-[0.88rem] text-muted-foreground print:text-black">{subtitle}</span>}
      <span className="hidden text-[0.8rem] print:block">{t("scanHint")}</span>

      <div className="mt-1 flex w-full flex-col gap-2 border-t border-line pt-3 text-[0.8rem] print:hidden">
        <a href={url} target="_blank" rel="noreferrer" className="truncate font-mono text-cyan hover:underline">
          {url.replace(/^https?:\/\//, "")}
        </a>
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground">{t("scans", { count: qr.scan_count })}</span>
          <form action={toggleQr}>
            <input type="hidden" name="id" value={qr.id} />
            <input type="hidden" name="active" value={String(qr.is_active)} />
            <button
              type="submit"
              className={cn(
                "min-h-9 rounded-full border px-3 font-semibold transition-colors",
                qr.is_active ? "border-line hover:border-pink hover:text-pink" : "border-good/60 text-good hover:bg-good/10",
              )}
            >
              {qr.is_active ? t("disable") : t("enable")}
            </button>
          </form>
        </div>
      </div>
    </li>
  );
}

/** QR карточкасындағы атау: формула/белгі және аты */
async function describeTarget(type: QrType, target: string) {
  const locale = await currentLocale();
  if (type === "ar" || type === "molecule") {
    const molecule = getMolecule(target);
    const tm = await getTranslations("Molecules");
    return molecule ? { title: molecule.formula, subtitle: tm(`${molecule.id}.name`) } : { title: target };
  }
  if (type === "element") {
    const element = getElement(target);
    return element ? { title: element.symbol, subtitle: element.name[locale] } : { title: target };
  }
  const tExam = await getTranslations("Exam");
  return { title: tExam("untShort"), subtitle: tExam("untTitle") };
}
