"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { QUESTS, XP_PER_LEVEL } from "../game/quests";
import { useStore, type HudStore } from "../game/store";
import { muted, pill, topButton } from "./styles";

const SPEEDS = [1, 5, 20];

type Props = {
  store: HudStore;
  onSpeed: (s: number) => void;
  onHelp: () => void;
  onJournal: () => void;
  onQuests: () => void;
  onSound: () => void;
};

/** Көзілдірік / қолғап белгісі: киілсе — жасыл, кимесе — қызғылт сары нүкте */
function PpeDot({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-[5px]", on ? "text-good" : muted)}>
      <span aria-hidden className={cn("size-2 rounded-full", on ? "bg-good" : "bg-[var(--warn)]")} />
      {label}
    </span>
  );
}

/** Жоғарғы панель: атауы, деңгей мен XP, қорғаныс құралдары мен қауіпсіздік, уақыт, журнал, тапсырмалар, дыбыс, көмек, шығу */
export function TopBar({ store, onSpeed, onHelp, onJournal, onQuests, onSound }: Props) {
  const t = useTranslations("VirtualLab3D");
  const speed = useStore(store, (s) => s.speed);
  const xp = useStore(store, (s) => s.xp);
  const level = useStore(store, (s) => s.level);
  const safety = useStore(store, (s) => s.safety);
  const goggles = useStore(store, (s) => s.goggles);
  const gloves = useStore(store, (s) => s.gloves);
  const done = useStore(store, (s) => s.done);
  const sound = useStore(store, (s) => s.sound);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 flex flex-wrap items-start gap-2 pt-[max(10px,env(safe-area-inset-top))] pr-[max(12px,env(safe-area-inset-right))] pl-[max(12px,env(safe-area-inset-left))] max-[700px]:gap-1.5 [&>*]:pointer-events-auto">
      <div className={cn(pill, "font-display text-[0.9rem] font-extrabold")}>
        {t("brand")}
        <small className="ml-1 font-mono text-[0.6rem] tracking-[0.14em] text-cyan max-[700px]:hidden">CHEMVERSE</small>
      </div>
      <div className={pill}>
        <span>{t(`levels.${level}`)}</span>
        <b className="tabular-nums">{xp} XP</b>
        <div className="h-[5px] w-[70px] overflow-hidden rounded-[3px] bg-[var(--hud-2)]" aria-hidden>
          <i className="block h-full bg-cyan transition-[width] duration-400 motion-reduce:transition-none" style={{ width: `${((xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100}%` }} />
        </div>
      </div>
      <div className={pill}>
        <PpeDot on={goggles} label={t("top.goggles")} />
        <PpeDot on={gloves} label={t("top.gloves")} />
        <span className={muted}>
          {t("top.safety")} <b className="text-[var(--hud-text)] tabular-nums">{safety}</b>
        </span>
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
      <button type="button" className={topButton} onClick={onJournal}>
        {t("top.journal")}
      </button>
      <button type="button" className={topButton} onClick={onQuests}>
        {t("top.quests")}{" "}
        <b className="text-cyan tabular-nums">
          {done.length}/{QUESTS.length}
        </b>
      </button>
      <button type="button" className={topButton} aria-pressed={sound} onClick={onSound}>
        {t(sound ? "top.soundOn" : "top.soundOff")}
      </button>
      <button type="button" className={topButton} onClick={onHelp} aria-label={t("help")} title={t("help")}>
        ?
      </button>
      <Link href="/virtual-lab" className={topButton}>
        {t("exit")}
      </Link>
    </div>
  );
}
