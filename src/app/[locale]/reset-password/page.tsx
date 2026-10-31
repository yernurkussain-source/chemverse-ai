import { Suspense } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { FormError } from "@/components/auth/form-parts";
import { ResetPasswordForm } from "@/components/auth/password-forms";
import { canResetPassword } from "@/features/auth/recovery";
import { Link } from "@/i18n/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return { title: t("resetTitle") };
}

// «Құпия сөзді ұмыттым» хатындағы сілтеме осында әкеледі (auth/callback сессияны ашқаннан кейін)
export default function ResetPasswordPage() {
  const t = useTranslations("Auth");
  return (
    <AuthCard title={t("resetTitle")} subtitle={t("resetSubtitle")}>
      <Suspense fallback={<p className="text-center text-muted-foreground">{t("pending")}</p>}>
        <ResetContent />
      </Suspense>
    </AuthCard>
  );
}

async function ResetContent() {
  await connection(); // сессия мен уақыт — тек сұраныс кезінде (кілтсіз build-те де алдын ала жиналмауы үшін)
  const t = await getTranslations("Auth");
  const user = isSupabaseConfigured ? (await (await createClient()).auth.getUser()).data.user : null;
  if (canResetPassword(user)) return <ResetPasswordForm />;
  return (
    <div className="flex flex-col items-center gap-3">
      <FormError message={t("errors.link_expired")} />
      <Link href="/forgot-password" className="font-semibold text-cyan hover:underline">
        {t("sendReset")}
      </Link>
    </div>
  );
}
