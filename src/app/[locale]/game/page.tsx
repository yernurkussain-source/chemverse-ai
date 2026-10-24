import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { GameLoader } from "@/features/virtual-lab-3d/GameLoader";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("VirtualLab3D");
  return { title: t("title"), description: t("description") };
}

// 3D зертхана (docs/game/GAME_SPEC.md): бірінші жақтан көрінетін химия зертханасы
export default function GamePage() {
  return <GameLoader />;
}
