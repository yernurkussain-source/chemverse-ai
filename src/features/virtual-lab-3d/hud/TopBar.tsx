"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useStore, type HudStore } from "../game/store";
import { pill, topButton } from "./styles";

const SPEEDS = [1, 5, 20];

/** Жоғарғы панель: атауы, уақыт жылдамдығы (×1 / ×5 / ×20), басқару көмегі, шығу */
export function TopBar({ store, onSpeed, onHelp }: { store: HudStore; onSpeed: (s: number) => void; onHelp: () => void }) {
  const t = useTranslations("VirtualLab3D");
  const speed = useStore(store, (s) => s.speed);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 pt-[max(10px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pl-[max(12px,env(safe-area-inset-left))] max-[700px]:gap-1.5 [&>*]:pointer-events-auto">
      <div className={cn(pill, "font-display text-[0.9rem] font-extrabold")}>
        {t("brand")}
        <small className="ml-1 font-mono text-[0.6rem] tracking-[0.14em] text-cyan max-[700px]:hidden">CHEMVERSE</small>
      </div>
      <div className="flex-1" />
      <div className="flex" role="group" aria-label={t("speedLabel")}>
        {SPEEDS.map((s, i) => (
          <button
            key={s}
            type="button"
            aria-pressed={speed === s}
            onClick={() => onSpeed(s)}
            className={cn(
              topButton,
              "-ml-px rounded-none",
              i === 0 && "ml-0 rounded-l-xl",
              i === SPEEDS.length - 1 && "rounded-r-xl",
              speed === s && "border-cyan bg-cyan text-on-accent",
            )}
          >
            ×{s}
          </button>
        ))}
      </div>
      <button type="button" className={topButton} onClick={onHelp} aria-label={t("help")} title={t("help")}>
        ?
      </button>
      <Link href="/virtual-lab" className={topButton}>
        {t("exit")}
      </Link>
    </div>
  );
}
