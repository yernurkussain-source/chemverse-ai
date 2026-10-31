import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { RegisterForm } from "@/components/auth/register-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("registerTitle") };
}

export default function RegisterPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard
      title={t("registerTitle")}
      subtitle={t("registerSubtitle")}
      footer={
        <>
          <span className="text-muted-foreground">
            {t("haveAccount")}{" "}
            <Link href="/login" className="font-semibold text-cyan hover:underline">
              {t("toLogin")}
            </Link>
          </span>
          <span className="text-[0.78rem] text-muted-foreground">{t("consentGoogle")}</span>
        </>
      }
    >
      <RegisterForm />
    </AuthCard>
  );
}
