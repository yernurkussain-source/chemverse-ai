"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { createGame, type GameApi } from "./core/game";
import type { Tr } from "./game/i18n";
import { createHudStore, useStore } from "./game/store";
import { HandCard, LookCard, Toast } from "./hud/Cards";
import { Flash, GogglesOverlay, Journal, Quests } from "./hud/Panels";
import { Crosshair, Prompt } from "./hud/Prompt";
import { HUD_VARS, topButton } from "./hud/styles";
import { TopBar } from "./hud/TopBar";
import { TouchControls } from "./hud/TouchControls";
import { Welcome } from "./hud/Welcome";

/**
 * 3D зертхана: толық экран (сайттың мәзірі мен төменгі навигациясының үстінен).
 * Three.js сахнасы React-тан тыс жұмыс істейді (core/game.ts), React тек HUD-ты сызады.
 */
export default function LabGame() {
  const t = useTranslations("VirtualLab3D");
  const locale = useLocale();
  const stageRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<GameApi | null>(null);
  const [store] = useState(createHudStore);
  const phase = useStore(store, (s) => s.phase);

  useEffect(() => {
    const container = stageRef.current;
    if (!container) return;
    let game: GameApi | null = null;
    try {
      game = createGame({ container, store, tr: t as unknown as Tr, locale, canvasLabel: t("canvasLabel") });
      gameRef.current = game;
      store.set({ phase: "ready" });
    } catch (error) {
      console.error(error);
      store.set({ phase: "error" });
    }
    return () => {
      game?.dispose();
      gameRef.current = null;
    };
  }, [store, t, locale]);

  // Ойын ашық тұрғанда астындағы бет айналмайды
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prev;
    };
  }, []);

  return (
    <div
      className="dark fixed inset-0 z-[60] overflow-hidden bg-[#0b1020] font-sans text-[14px] leading-[1.45] text-[var(--hud-text)] select-none"
      style={HUD_VARS}
      // Браузер дыбысты тек пайдаланушы бірдеңе басқаннан кейін қосады
      onPointerDownCapture={() => gameRef.current?.unlockAudio()}
    >
      {/* Canvas-ты ойын өзі осы бос контейнерге қосады */}
      <div ref={stageRef} className="absolute inset-0" />
      {phase === "error" ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div className="max-w-md">
            <p className="mb-4">{t("webglError")}</p>
            <Link href="/virtual-lab" className={topButton}>
              {t("exit")}
            </Link>
          </div>
        </div>
      ) : (
        <>
          <GogglesOverlay store={store} />
          <Crosshair store={store} />
          <Prompt store={store} />
          <TopBar
            store={store}
            onSpeed={(s) => gameRef.current?.setSpeed(s)}
            onHelp={() => gameRef.current?.showHelp()}
            onJournal={() => gameRef.current?.toggleDrawer()}
            onQuests={() => gameRef.current?.setQuests(true)}
            onSound={() => gameRef.current?.toggleSound()}
          />
          <LookCard store={store} />
          <HandCard store={store} />
          <Toast store={store} />
          <Flash store={store} />
          <TouchControls
            store={store}
            api={{
              joy: (x, y) => gameRef.current?.touch.joy(x, y),
              right: (down) => gameRef.current?.touch.right(down),
              left: () => gameRef.current?.touch.left(),
              back: () => gameRef.current?.touch.back(),
            }}
          />
          <Journal store={store} onClose={() => gameRef.current?.toggleDrawer(false)} />
          {phase === "ready" && (
            <Welcome store={store} onStart={() => gameRef.current?.start()} onQuality={(q) => gameRef.current?.setQuality(q)} />
          )}
          <Quests store={store} onClose={() => gameRef.current?.setQuests(false)} />
        </>
      )}
    </div>
  );
}
