import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { JoinCodeForm } from "@/components/live/join-code-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("LiveClass");
  return { title: t("joinPageTitle") };
}

// Live сабаққа қосылу: проектордағы 6 санды кодты енгізу (тіркеусіз)
export default function JoinPage() {
  const t = useTranslations("LiveClass");
  return (
    <div className="page-wrap flex flex-col items-center gap-4 py-12 text-center md:py-20">
      <h1 className="text-[clamp(1.6rem,4vw,2.4rem)] font-bold">{t("joinPageTitle")}</h1>
      <p className="max-w-[40ch] text-muted-foreground">{t("joinPageText")}</p>
      <JoinCodeForm />
    </div>
  );
}
