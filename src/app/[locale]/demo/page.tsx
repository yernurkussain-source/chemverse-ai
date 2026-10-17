import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { DemoButtons } from "@/components/auth/demo-buttons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Demo");
  return { title: t("title") };
}

// Қазыларға арналған: тіркелусіз бір батырмамен кіру
export default function DemoPage() {
  const t = useTranslations("Demo");
  return (
    <AuthCard
      title={t("title")}
      subtitle={t("subtitle")}
      footer={<span className="text-[0.8rem] text-muted-foreground">{t("note")}</span>}
    >
      <DemoButtons />
    </AuthCard>
  );
}
