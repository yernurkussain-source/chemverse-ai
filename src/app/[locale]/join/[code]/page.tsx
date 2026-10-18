import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { LivePlayer } from "@/components/live/live-player";
import { CODE_PATTERN } from "@/features/live/server";

// Код алдын ала белгісіз — бет тек сұраныс кезінде сызылады
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LiveClass");
  return { title: t("joinPageTitle") };
}

type Params = PageProps<"/[locale]/join/[code]">["params"];

// Оқушының Live экраны (телефон): тіркеусіз, тек атымен
export default function JoinCodePage({ params }: PageProps<"/[locale]/join/[code]">) {
  const t = useTranslations("LiveClass");
  return (
    <div className="page-wrap mx-auto max-w-lg py-5">
      <Suspense fallback={<p className="text-muted-foreground">{t("loading")}</p>}>
        <Player params={params} />
      </Suspense>
    </div>
  );
}

async function Player({ params }: { params: Params }) {
  const { code } = await params;
  if (!CODE_PATTERN.test(code)) notFound();
  return <LivePlayer code={code} />;
}
