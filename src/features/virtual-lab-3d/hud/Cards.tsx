"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useStore, type HudStore } from "../game/store";
import { muted, panel } from "./styles";

/** Қарап тұрған ыдыстың карточкасы (сол жақ төменгі бұрыш; телефонда — жоғарыда) */
export function LookCard({ store }: { store: HudStore }) {
  const look = useStore(store, (s) => s.look);
  if (!look) return null;
  return (
    <div
      className={cn(
        panel,
        "bottom-[max(12px,env(safe-area-inset-bottom))] left-[max(12px,env(safe-area-inset-left))] w-[300px] px-[14px] py-3",
        "max-[700px]:top-[104px] max-[700px]:bottom-auto max-[700px]:w-[min(300px,calc(100vw-24px))] max-[700px]:px-[11px] max-[700px]:py-[9px]",
      )}
    >
      <h4 className="mb-2 flex justify-between gap-2 font-display text-[0.8rem] font-semibold">
        {look.title}
        <small className={cn("font-sans font-medium", muted)}>{look.sub}</small>
      </h4>
      <div className="mb-1.5 grid grid-cols-3 gap-1.5">
        {look.meters.map((m) => (
          <div key={m.label} className="min-w-0 rounded-[9px] bg-[var(--hud-2)] px-2 py-[5px]">
            <span className={cn("block font-mono text-[0.58rem] tracking-[0.08em] uppercase", muted)}>{m.label}</span>
            <b className={cn("font-mono text-base tabular-nums", m.accent && "text-cyan")}>{m.value}</b>
          </div>
        ))}
      </div>
      {look.rows.map((row, i) => (
        <div key={i} className="mt-1 flex flex-wrap gap-1">
          {row.map((chip, j) => (
            <span key={j} className="rounded-md bg-[var(--hud-2)] px-1.5 py-0.5 font-mono text-[0.7rem]">
              {chip.color && <i className="mr-1 inline-block size-[7px] rounded-full border border-white/30" style={{ background: chip.color }} />}
              {chip.text}
            </span>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Қолдағы заттар (оң жақ төменгі бұрыш; телефонда жасырылады) */
export function HandCard({ store }: { store: HudStore }) {
  const t = useTranslations("VirtualLab3D");
  const hand = useStore(store, (s) => s.hand);
  if (!hand) return null;
  return (
    <div
      className={cn(
        panel,
        "right-[max(12px,env(safe-area-inset-right))] bottom-[max(12px,env(safe-area-inset-bottom))] max-w-[300px] px-3 py-[9px] text-[0.84rem] max-[700px]:hidden",
      )}
    >
      {t("hand.right")}: <b className="text-cyan">{hand.right}</b>
      <br />
      {t("hand.left")}: <b className="text-cyan">{hand.left}</b>
      {hand.note && <small className="mt-[3px] block text-amber">⚠ {hand.note}</small>}
      <small className={cn("mt-[3px] block", muted)}>{t("hand.returnHint")}</small>
    </div>
  );
}

/** Қысқа хабарлама: 3,4 секундтан кейін жасырылады */
export function Toast({ store }: { store: HudStore }) {
  const toast = useStore(store, (s) => s.toast);
  const [hiddenId, setHiddenId] = useState(0);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setHiddenId(toast.id), 3400);
    return () => clearTimeout(timer);
  }, [toast]);
  if (!toast || toast.id === hiddenId) return null;
  return (
    <div
      role="status"
      className={cn(
        panel,
        "top-[70px] left-1/2 z-[6] max-w-[min(92vw,460px)] -translate-x-1/2 border-l-4 px-[14px] py-2.5 font-semibold",
        toast.bad ? "border-l-[var(--warn)]" : "border-l-good",
      )}
    >
      {toast.text}
    </div>
  );
}
