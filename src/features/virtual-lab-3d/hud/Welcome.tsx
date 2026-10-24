"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useStore, type HudStore } from "../game/store";
import { muted } from "./styles";

const kbd = (chunks: ReactNode) => <kbd className="rounded bg-white/12 px-[5px] font-mono">{chunks}</kbd>;
const strong = (chunks: ReactNode) => <b className="font-bold text-[var(--hud-text)]">{chunks}</b>;
const underline = (chunks: ReactNode) => <u>{chunks}</u>;

/** Қош келдің терезесі: зертхана туралы және басқару (компьютер / телефон) */
export function Welcome({ store, onStart }: { store: HudStore; onStart: () => void }) {
  const t = useTranslations("VirtualLab3D");
  const welcome = useStore(store, (s) => s.welcome);
  if (!welcome) return null;
  const rich = { kbd, b: strong, u: underline };
  const box = "rounded-xl bg-[var(--hud-2)] px-3 py-2.5 text-[0.84rem] leading-relaxed";
  const label = "mb-1 block font-mono text-[0.68rem] tracking-[0.1em] text-cyan uppercase";
  return (
    <div className="absolute inset-0 z-10 grid place-items-center bg-[rgba(5,9,20,.62)] px-[max(16px,env(safe-area-inset-left))]">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vl3d-welcome-title"
        className="max-h-[88vh] w-full max-w-[600px] overflow-auto rounded-[20px] border border-[var(--hud-line)] bg-[#0f1631] p-[22px] select-text"
      >
        <h2 id="vl3d-welcome-title" className="mb-2 font-display text-[1.3rem] font-bold text-balance">
          {t("welcome.title")}
        </h2>
        <p className={cn("mb-3", muted)}>{t("welcome.text")}</p>
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className={box}>
            <b className={label}>{t("welcome.desktopTitle")}</b>
            {(["l1", "l2", "l3", "l4", "l5", "l6"] as const).map((k) => (
              <span key={k} className="block">
                {t.rich(`welcome.desktop.${k}`, rich)}
              </span>
            ))}
          </div>
          <div className={box}>
            <b className={label}>{t("welcome.phoneTitle")}</b>
            {(["l1", "l2", "l3", "l4"] as const).map((k) => (
              <span key={k} className="block">
                {t.rich(`welcome.phone.${k}`, rich)}
              </span>
            ))}
            <b className={cn(label, "mt-3")}>{t("welcome.toolsTitle")}</b>
            {t("welcome.tools")}
          </div>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onStart}
          className="rounded-xl border border-cyan bg-cyan px-[18px] py-2.5 font-bold text-on-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan"
        >
          {welcome === "first" ? t("welcome.start") : t("welcome.continue")}
        </button>
      </div>
    </div>
  );
}
