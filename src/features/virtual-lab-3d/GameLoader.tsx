"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

function Loading() {
  const t = useTranslations("VirtualLab3D");
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-[#0b1020] text-[#eef2ff]" role="status">
      <p className="font-display font-semibold">{t("loading")}</p>
    </div>
  );
}

// Three.js (~600 КБ) тек осы бет ашылғанда жүктеледі және тек браузерде іске қосылады
const LabGame = dynamic(() => import("./LabGame"), { ssr: false, loading: Loading });

export function GameLoader() {
  return <LabGame />;
}
