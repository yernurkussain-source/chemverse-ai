"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ELEMENTS } from "@/lib/chemistry/elements";
import { cn } from "@/lib/utils";

const ROUNDS = 10;

type GameState = { max: number; questions: number[]; round: number; score: number; picked: number | null };

/** «Элементті тап»: атауы бойынша кестеден элементті табу (10 сұрақ, қайталанбайды) */
export function useFindElementGame() {
  const [game, setGame] = useState<GameState | null>(null);
  const target = game && game.round < ROUNDS ? game.questions[game.round] : null;

  function start(max: number) {
    // Фишер–Йейтс араластыруы: 1..max ішінен алғашқы 10-ы
    const pool = Array.from({ length: max }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    setGame({ max, questions: pool.slice(0, ROUNDS), round: 0, score: 0, picked: null });
  }

  function answer(z: number) {
    if (!game || target === null || game.picked !== null) return;
    const ok = z === target;
    const { questions } = game;
    setGame({ ...game, picked: z, score: game.score + (ok ? 1 : 0) });
    // Жауапты сәл көрсетіп, келесі сұраққа өтеміз (ойын қайта басталса — ескі таймер ештеңе өзгертпейді)
    setTimeout(() => setGame((g) => (g?.questions === questions ? { ...g, round: g.round + 1, picked: null } : g)), ok ? 700 : 1600);
  }

  /** Кестедегі ұяшықтың күйі: дұрыс жауап — жасыл, қате басылғаны — қызыл */
  function cellState(z: number): "correct" | "wrong" | null {
    if (!game || game.picked === null) return null;
    if (z === target) return "correct";
    return z === game.picked ? "wrong" : null;
  }

  return { game, target, start, answer, cellState, stop: () => setGame(null) };
}

export type FindElementGame = ReturnType<typeof useFindElementGame>;

export function FindElementPanel({ game: { game, target, start, stop } }: { game: FindElementGame }) {
  const t = useTranslations("PeriodicTable.game");
  const locale = useLocale();

  if (!game) {
    return (
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-line bg-panel px-4 py-3">
        <p className="mr-auto text-[0.88rem]">
          <b className="font-display">🎯 {t("title")}</b> <span className="text-muted-foreground">{t("hint")}</span>
        </p>
        <Button variant="panel" size="pill-sm" onClick={() => start(20)}>
          {t("start20")}
        </Button>
        <Button variant="panel" size="pill-sm" onClick={() => start(ELEMENTS.length)}>
          {t("startAll")}
        </Button>
      </div>
    );
  }

  const finished = target === null;
  const ok = game.picked !== null && game.picked === target;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-cyan-dim bg-linear-135 from-task-a to-task-b px-4 py-3" aria-live="polite">
      {finished ? (
        <p className="mr-auto font-display text-lg font-bold">
          {t("result", { score: game.score, total: ROUNDS })} {game.score >= 8 ? "🏆" : game.score >= 5 ? "👍" : "💪"}
        </p>
      ) : (
        <div className="mr-auto">
          <p className="text-[0.85rem] text-muted-foreground">
            {t("find")} <span className="font-mono">{t("progress", { round: game.round + 1, total: ROUNDS, score: game.score })}</span>
          </p>
          <p className="font-display text-xl font-bold">{ELEMENTS[target - 1].name[locale]}</p>
          {game.picked !== null && (
            <p className={cn("text-[0.85rem] font-semibold", ok ? "text-good" : "text-pink")}>{ok ? t("correct") : t("wrong")}</p>
          )}
        </div>
      )}
      {finished && (
        <Button variant="glow" size="pill-sm" onClick={() => start(game.max)}>
          {t("again")}
        </Button>
      )}
      <Button variant="panel" size="pill-sm" onClick={stop}>
        {t("stop")}
      </Button>
    </div>
  );
}
