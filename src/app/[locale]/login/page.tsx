import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { LoginForm } from "@/components/auth/login-form";
import { Link } from "@/i18n/navigation";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("loginTitle") };
}

export default function LoginPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard
      title={t("loginTitle")}
      subtitle={t("loginSubtitle")}
      footer={
        <>
          <span className="text-muted-foreground">
            {t("noAccount")}{" "}
            <Link href="/register" className="font-semibold text-cyan hover:underline">
              {t("toRegister")}
            </Link>
          </span>
          <span className="text-muted-foreground">
            {t("orDemo")}{" "}
            <Link href="/demo" className="font-semibold text-cyan hover:underline">
              {t("toDemo")}
            </Link>
          </span>
        </>
      }
    >
      <LoginForm />
    </AuthCard>
  );
}
