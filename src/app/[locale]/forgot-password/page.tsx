import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { ForgotPasswordForm } from "@/components/auth/password-forms";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("forgotTitle") };
}

export default function ForgotPasswordPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard
      title={t("forgotTitle")}
      subtitle={t("forgotSubtitle")}
      footer={
        <span className="text-muted-foreground">
          {t("haveAccount")}{" "}
          <Link href="/login" className="font-semibold text-cyan hover:underline">
            {t("toLogin")}
          </Link>
        </span>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
