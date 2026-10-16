"use client";

import { useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Eyebrow, Panel } from "./section";

const OPTIONS = [
  { key: "a", letter: "A", correct: false },
  { key: "b", letter: "B", correct: true },
  { key: "c", letter: "C", correct: false },
  { key: "d", letter: "D", correct: false },
] as const;

// Симуляциядағы жауаптар саны (барлығы 26 оқушы, 17-сі дұрыс)
const TARGET = [2, 17, 4, 3];
const TOTAL = TARGET.reduce((a, b) => a + b, 0);

/**
 * Live сабақ симуляциясы: бөлім экранға көрінгенде жауаптар бірінен соң бірі «келеді».
 * Нағыз Realtime нұсқасы 8-күні Supabase арқылы жасалады.
 * qr — серверде сызылған QR код (QrCode компоненті).
 */
export function LiveClassDemo({ qr }: { qr: ReactNode }) {
  const t = useTranslations("Live");
  const [counts, setCounts] = useState([0, 0, 0, 0]);
  const [done, setDone] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<number | undefined>(undefined);

  function run() {
    window.clearInterval(timerRef.current);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Жауаптарды кездейсоқ ретпен араластырамыз
    const pool = TARGET.flatMap((n, i) => Array<number>(n).fill(i)).sort(() => Math.random() - 0.5);
    setCounts([0, 0, 0, 0]);
    setDone(false);
    timerRef.current = window.setInterval(
      () => {
        const next = pool.pop();
        if (next === undefined) {
          window.clearInterval(timerRef.current);
          setDone(true);
          return;
        }
        setCounts((c) => c.map((v, i) => (i === next ? v + 1 : v)));
      },
      reduceMotion ? 40 : 260,
    );
  }

  // Бөлім экранға алғаш көрінгенде іске қосылады
  const onVisible = useEffectEvent(run);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          observer.disconnect();
          onVisible();
        }
      },
      { threshold: 0.35 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const answered = counts.reduce((a, b) => a + b, 0);

  return (
    <div ref={rootRef} className="grid gap-4.5 md:grid-cols-[280px_1fr]">
      <Panel className="flex flex-col items-center gap-3 text-center">
        <Eyebrow>{t("joinCode")}</Eyebrow>
        <div className="rounded-[14px] bg-white p-3 leading-none">{qr}</div>
        <div className="font-mono text-[1.8rem] font-semibold tracking-[0.18em] text-cyan">482 913</div>
        <div className="text-[0.85rem] text-muted-foreground">
          {t.rich("participants", {
            count: answered,
            total: TOTAL,
            b: (chunks) => <b className="text-foreground tabular-nums">{chunks}</b>,
          })}
        </div>
      </Panel>

      <Panel>
        <Eyebrow className="mb-2">{t("questionMeta")}</Eyebrow>
        <p className="mb-4 font-display text-[1.15rem] font-semibold">{t("question")}</p>
        <ul aria-label={t("answersLabel")} className="grid gap-2.5">
          {OPTIONS.map((option, i) => (
            <li key={option.key} className="grid grid-cols-[34px_1fr_48px] items-center gap-3">
              <span className="grid size-[34px] place-items-center rounded-[10px] border border-line bg-panel-2 font-mono font-semibold">
                {option.letter}
              </span>
              <div className="relative h-[38px] overflow-hidden rounded-[10px] bg-panel-2">
                <div
                  className={cn(
                    "absolute inset-y-0 left-0 rounded-[10px] transition-[width] duration-500 ease-out",
                    option.correct
                      ? "bg-linear-to-r from-good/20 to-good/50"
                      : "bg-linear-to-r from-cyan/20 to-cyan/45",
                  )}
                  style={{ width: `${(counts[i] / TOTAL) * 100}%` }}
                />
                <span className="relative z-[1] flex h-full items-center pl-3 text-[0.92rem] font-semibold">
                  {t(`options.${option.key}`)}
                </span>
              </div>
              <span className="text-right font-mono tabular-nums">{counts[i]}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4.5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[0.85rem] text-muted-foreground" aria-live="polite">
            {done ? (
              <>
                <b className="text-good">{t("resultCorrect")}</b> {t("resultStats")}
              </>
            ) : (
              t("collecting")
            )}
          </p>
          <Button variant="panel" size="pill-sm" onClick={run}>
            {t("replay")}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
