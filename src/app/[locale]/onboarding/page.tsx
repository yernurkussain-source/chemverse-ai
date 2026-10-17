import { Suspense } from "react";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { AuthCard } from "@/components/auth/auth-card";
import { OnboardingForm } from "@/components/auth/onboarding-form";
import { getCurrentAccount } from "@/features/auth/queries";
import { redirect } from "@/i18n/navigation";
import { locale as rootLocale } from "next/root-params";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Onboarding");
  return { title: t("title") };
}

export default function OnboardingPage() {
  const t = useTranslations("Onboarding");
  const tProfile = useTranslations("Profile");
  return (
    <AuthCard title={t("title")} subtitle={t("subtitle")}>
      <Suspense fallback={<p className="text-center text-muted-foreground">{tProfile("loading")}</p>}>
        <OnboardingLoader />
      </Suspense>
    </AuthCard>
  );
}

// Сессияны оқитын бөлік (сұраныс кезінде орындалады)
async function OnboardingLoader() {
  const account = await getCurrentAccount();
  if (!account) {
    const value = await rootLocale();
    redirect({ href: "/login", locale: hasLocale(routing.locales, value) ? value : routing.defaultLocale });
    return null;
  }
  const { user, profile } = account;
  const role = profile?.onboarded && profile.role !== "guest" ? profile.role : null;

  return (
    <OnboardingForm
      defaults={{
        role,
        fullName: profile?.full_name ?? String(user.user_metadata?.full_name ?? ""),
        school: profile?.school ?? "",
        grade: profile?.grade ?? null,
      }}
    />
  );
}
