import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale, useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LiveHost } from "@/components/live/live-host";
import { joinUrl } from "@/features/live/join-url";
import { getTeacherId } from "@/features/teacher/queries";
import { Link, redirect } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

// Сессия id-і алдын ала белгісіз — бет тек сұраныс кезінде сызылады
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LiveClass");
  return { title: t("title") };
}

type Params = PageProps<"/[locale]/teacher/live/[id]">["params"];

export default function LiveHostPage({ params }: PageProps<"/[locale]/teacher/live/[id]">) {
  const t = useTranslations("LiveClass");
  return (
    <div className="page-wrap py-6 md:py-8">
      <Link href="/teacher/live" className="mb-4 inline-block text-[0.9rem] font-semibold text-cyan hover:underline">
        ← {t("backToLive")}
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <HostContent params={params} />
      </Suspense>
    </div>
  );
}

async function HostContent({ params }: { params: Params }) {
  const { id } = await params;
  const value = await rootLocale();
  const locale: Locale = hasLocale(routing.locales, value) ? value : routing.defaultLocale;

  const { userId, isTeacher } = await getTeacherId();
  if (!userId || !isTeacher) {
    redirect({ href: "/teacher", locale });
    return null;
  }
  // RLS: мұғалім тек өз сессиясын көреді
  const supabase = await createClient();
  const { data: session } = await supabase.from("live_sessions").select("id, code").eq("id", id).maybeSingle();
  if (!session) notFound();

  return <LiveHost sessionId={session.id as string} code={session.code as string} joinUrl={await joinUrl(session.code as string, locale)} />;
}
