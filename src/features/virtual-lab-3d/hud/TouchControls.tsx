"use client";

import { useRef, type PointerEvent } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { useStore, type HudStore } from "../game/store";

export type TouchApi = {
  joy: (x: number, y: number) => void;
  right: (down: boolean) => void;
  left: () => void;
  back: () => void;
};

const KNOB = 34;

/**
 * Телефондағы басқару (прототиптегідей): сол жақта — жүру джойстигі,
 * оң жақта — ОҢ ҚОЛ (басып тұрса — құю), СОЛ ҚОЛ, Орнына. Экранды сүйреу — қарау (core/controls.ts).
 */
export function TouchControls({ store, api }: { store: HudStore; api: TouchApi }) {
  const t = useTranslations("VirtualLab3D");
  const touch = useStore(store, (s) => s.touch);
  const welcome = useStore(store, (s) => s.welcome);
  const quests = useStore(store, (s) => s.quests);
  const joyRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const joyId = useRef<number | null>(null);
  if (!touch || welcome || quests) return null;

  const moveJoy = (e: PointerEvent) => {
    const el = joyRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let x = (e.clientX - r.left - r.width / 2) / (r.width / 2);
    let y = (e.clientY - r.top - r.height / 2) / (r.height / 2);
    const l = Math.hypot(x, y);
    if (l > 1) {
      x /= l;
      y /= l;
    }
    api.joy(x, y);
    if (knobRef.current) knobRef.current.style.transform = `translate(${x * KNOB}px, ${y * KNOB}px)`;
  };
  const endJoy = (e: PointerEvent) => {
    if (e.pointerId !== joyId.current) return;
    joyId.current = null;
    api.joy(0, 0);
    if (knobRef.current) knobRef.current.style.transform = "";
  };
  const capture = (e: PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // саусақ экраннан кетіп қалған
    }
  };
  const round = "absolute grid touch-none place-items-center rounded-full font-extrabold select-none active:bg-pink active:text-white";

  return (
    <div className="pointer-events-none absolute inset-0 [&>*]:pointer-events-auto">
      <div
        ref={joyRef}
        role="presentation"
        className="absolute bottom-[calc(150px+env(safe-area-inset-bottom))] left-[max(18px,env(safe-area-inset-left))] size-[120px] touch-none rounded-full border border-[var(--hud-line)] bg-[rgba(9,15,32,.45)]"
        onPointerDown={(e) => {
          joyId.current = e.pointerId;
          capture(e);
          moveJoy(e);
        }}
        onPointerMove={(e) => e.pointerId === joyId.current && moveJoy(e)}
        onPointerUp={endJoy}
        onPointerCancel={endJoy}
      >
        <div ref={knobRef} className="absolute top-1/2 left-1/2 -mt-[26px] -ml-[26px] size-[52px] rounded-full border border-white/40 bg-white/28" />
      </div>
      <button
        type="button"
        className={cn(round, "right-[max(18px,env(safe-area-inset-right))] bottom-[calc(262px+env(safe-area-inset-bottom))] size-[58px] border border-[var(--hud-line)] bg-[rgba(9,15,32,.7)] text-[0.68rem] font-bold")}
        onClick={() => api.back()}
      >
        {t("touch.back")}
      </button>
      <button
        type="button"
        className={cn(round, "right-[max(116px,env(safe-area-inset-right))] bottom-[calc(150px+env(safe-area-inset-bottom))] size-[70px] bg-[rgba(255,200,87,.85)] text-[0.7rem] text-[#1b1300]")}
        onPointerDown={(e) => {
          e.preventDefault();
          api.left();
        }}
      >
        {t("touch.left")}
      </button>
      <button
        type="button"
        className={cn(round, "right-[max(18px,env(safe-area-inset-right))] bottom-[calc(160px+env(safe-area-inset-bottom))] size-[86px] bg-[rgba(63,224,240,.85)] text-[0.82rem] text-[#04121a]")}
        onPointerDown={(e) => {
          e.preventDefault();
          capture(e);
          api.right(true);
        }}
        onPointerUp={() => api.right(false)}
        onPointerCancel={() => api.right(false)}
      >
        {t("touch.right")}
      </button>
    </div>
  );
}
