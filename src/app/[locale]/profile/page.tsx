import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ComingSoon } from "@/components/layout/coming-soon";
import { UserIcon } from "@/components/layout/nav-icons";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("ComingSoon.pages.profile");
  return { title: t("title") };
}

export default function ProfilePage() {
  return <ComingSoon page="profile" icon={<UserIcon size={30} />} />;
}
