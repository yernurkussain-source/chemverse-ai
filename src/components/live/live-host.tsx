"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { QrCode } from "@/components/qr/qr-code";
import { Button } from "@/components/ui/button";
import type { HostLiveState } from "@/app/api/live/[code]/host/route";
import { controlLive, type LiveCommand } from "@/features/live/actions";
import { useCountdown, useLiveState } from "@/features/live/use-live-state";
import { cn } from "@/lib/utils";
import { optionStyle } from "./option-style";

/** Мұғалімнің Live экраны (проекторға арналған): код + QR → сұрақ, таймер, тірі диаграмма → рейтинг */
export function LiveHost({ sessionId, code, joinUrl }: { sessionId: string; code: string; joinUrl: string }) {
  const t = useTranslations("LiveClass");
  const locale = useLocale();
  const rootRef = useRef<HTMLDivElement>(null);
  const { state, refetch, connected } = useLiveState<HostLiveState>(code, `/api/live/${code}/host?locale=${locale}`);
  const [pending, startTransition] = useTransition();
  const [fullscreen, setFullscreen] = useState(false);
  const autoRevealed = useRef(-1);

  const remaining = useCountdown(
    state?.phase === "question" ? state.questionStartedAt : null,
    state?.secondsPerQuestion ?? 20,
    state?.serverNow,
  );

  function send(command: LiveCommand) {
    startTransition(async () => {
      await controlLive(sessionId, command);
      await refetch();
    });
  }

  // Уақыт бітсе немесе бәрі жауап берсе — дұрыс жауап автоматты көрсетіледі
  useEffect(() => {
    if (!state || state.phase !== "question" || autoRevealed.current === state.index) return;
    const everyone = state.players.length > 0 && state.answered >= state.players.length;
    if (remaining === 0 || everyone) {
      autoRevealed.current = state.index;
      startTransition(async () => {
        await controlLive(sessionId, "reveal");
        await refetch();
      });
    }
  }, [state, remaining, refetch, sessionId]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  }

  const spacedCode = `${code.slice(0, 3)} ${code.slice(3)}`;

  return (
    <div
      ref={rootRef}
      className={cn("flex flex-col gap-5 bg-ink", fullscreen && "h-screen overflow-y-auto p-6 md:p-10")}
    >
      {/* Жоғарғы жолақ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[0.9rem] text-muted-foreground">
          {t("codeLabel")}: <b className="font-mono text-xl tracking-[0.12em] text-cyan">{spacedCode}</b>
          <span className={cn("ml-3 inline-block size-2 rounded-full", connected ? "bg-good" : "bg-amber")} title={connected ? t("online") : t("polling")} />
        </p>
        <div className="flex flex-wrap gap-2">
          {state && state.phase !== "finished" && state.phase !== "lobby" && (
            <Button type="button" variant="panel" size="pill-sm" disabled={pending} onClick={() => send("finish")}>
              {t("finishNow")}
            </Button>
          )}
          <Button type="button" variant="panel" size="pill-sm" onClick={toggleFullscreen}>
            {fullscreen ? t("exitFullscreen") : t("fullscreen")}
          </Button>
        </div>
      </div>

      {!state ? (
        <p className="text-muted-foreground">{t("loading")}</p>
      ) : state.phase === "lobby" ? (
        <Lobby state={state} joinUrl={joinUrl} spacedCode={spacedCode} pending={pending} onStart={() => send("start")} />
      ) : state.phase === "finished" ? (
        <Podium players={state.players} />
      ) : (
        <QuestionScreen state={state} remaining={remaining} pending={pending} send={send} />
      )}
    </div>
  );
}

function Lobby({
  state,
  joinUrl,
  spacedCode,
  pending,
  onStart,
}: {
  state: HostLiveState;
  joinUrl: string;
  spacedCode: string;
  pending: boolean;
  onStart: () => void;
}) {
  const t = useTranslations("LiveClass");
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[auto_1fr]">
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-panel p-6">
        <QrCode value={joinUrl} label={t("qrLabel")} size={260} className="rounded-xl" />
        <p className="text-center text-[0.95rem] text-muted-foreground">{t("scanOrGo")}</p>
        <p className="font-mono text-[0.95rem] break-all text-cyan">{joinUrl.replace(/^https?:\/\//, "").replace(/\/join\/\d+$/, "/join")}</p>
        <p className="font-mono text-[clamp(2.4rem,6vw,4.5rem)] leading-none font-bold tracking-[0.12em]">{spacedCode}</p>
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-[clamp(1.4rem,3vw,2.2rem)] font-bold">{t("players", { count: state.players.length })}</h2>
          <Button type="button" variant="glow" size="pill" disabled={pending} onClick={onStart} className="h-14 px-8 text-lg">
            {t("start", { total: state.total })}
          </Button>
        </div>
        {state.players.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line p-8 text-center text-lg text-muted-foreground">{t("waitingPlayers")}</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {state.players.map((p) => (
              <li key={p.name} className="animate-in rounded-full border border-line bg-panel px-4 py-2 text-lg font-semibold fade-in zoom-in-95">
                {p.name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function QuestionScreen({
  state,
  remaining,
  pending,
  send,
}: {
  state: HostLiveState;
  remaining: number | null;
  pending: boolean;
  send: (command: LiveCommand) => void;
}) {
  const t = useTranslations("LiveClass");
  const reveal = state.phase === "reveal";
  const max = Math.max(1, ...Object.values(state.counts));
  const correctCount = state.correctOptionId ? (state.counts[state.correctOptionId] ?? 0) : 0;
  const last = state.index >= state.total - 1;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-lg text-muted-foreground">{t("questionOf", { n: state.index + 1, total: state.total })}</p>
        <p className="text-lg">
          {t("answered", { count: state.answered, total: state.players.length })}
        </p>
        {!reveal && (
          <span
            className={cn(
              "grid size-16 place-items-center rounded-full border-4 font-mono text-2xl font-bold tabular-nums",
              remaining !== null && remaining <= 5 ? "border-pink text-pink" : "border-cyan text-cyan",
            )}
            role="timer"
          >
            {remaining ?? "–"}
          </span>
        )}
      </div>

      <h2 className="rounded-3xl border border-line bg-panel p-6 text-center font-sans text-[clamp(1.3rem,3vw,2.2rem)] leading-snug font-semibold">
        {state.question?.body}
      </h2>

      {/* Тірі диаграмма: жауаптар келген сайын бағандар өседі */}
      <ul className="grid gap-3 md:grid-cols-2">
        {state.question?.options.map((o) => {
          const style = optionStyle(o.label);
          const count = state.counts[o.id] ?? 0;
          const correct = reveal && o.id === state.correctOptionId;
          return (
            <li
              key={o.id}
              className={cn(
                "relative overflow-hidden rounded-2xl border-2 bg-panel p-4 transition-opacity",
                correct ? "border-good" : "border-line",
                reveal && !correct && "opacity-45",
              )}
            >
              <div
                className={cn("absolute inset-y-0 left-0 opacity-25 transition-[width] duration-500", style.bar)}
                style={{ width: `${(count / max) * 100}%` }}
              />
              <div className="relative flex items-center gap-3 text-[clamp(1rem,2vw,1.35rem)]">
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-bold text-on-accent", style.bg)}>
                  {style.shape}
                </span>
                <span className="flex-1 font-semibold">{o.body}</span>
                <span className="font-mono text-2xl font-bold tabular-nums">{count}</span>
                {correct && <span className="text-2xl text-good">✓</span>}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-wrap items-center justify-between gap-3">
        {reveal ? (
          <p className="text-lg">
            {t("correctStats", { correct: correctCount, total: state.answered })}
          </p>
        ) : (
          <span />
        )}
        {reveal ? (
          <Button type="button" variant="glow" size="pill" disabled={pending} onClick={() => send("next")} className="h-14 px-8 text-lg">
            {last ? t("showResults") : t("next")}
          </Button>
        ) : (
          <Button type="button" variant="panel" size="pill" disabled={pending} onClick={() => send("reveal")} className="h-14 px-8 text-lg">
            {t("reveal")}
          </Button>
        )}
      </div>

      {reveal && state.players.length > 0 && <Leaderboard players={state.players.slice(0, 5)} />}
    </div>
  );
}

function Leaderboard({ players }: { players: { name: string; score: number }[] }) {
  const t = useTranslations("LiveClass");
  return (
    <section>
      <h3 className="mb-2 font-display text-lg font-semibold">{t("top")}</h3>
      <ol className="flex flex-col gap-1.5">
        {players.map((p, i) => (
          <li key={p.name} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-2 text-lg">
            <span className="w-6 font-mono text-muted-foreground">{i + 1}</span>
            <span className="flex-1 font-semibold">{p.name}</span>
            <span className="font-mono text-cyan">{p.score}</span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Соңғы рейтинг: подиум (1–3 орын) және толық тізім */
function Podium({ players }: { players: { name: string; score: number }[] }) {
  const t = useTranslations("LiveClass");
  const [first, second, third] = players;
  const place = (p: { name: string; score: number } | undefined, medal: string, height: string, color: string) =>
    p && (
      <div className="flex w-full max-w-56 flex-col items-center gap-2">
        <span className="text-4xl">{medal}</span>
        <span className="text-center text-[clamp(1.1rem,2.4vw,1.6rem)] font-bold">{p.name}</span>
        <span className="font-mono text-lg text-muted-foreground">{p.score}</span>
        <div className={cn("w-full rounded-t-2xl", height, color)} />
      </div>
    );

  return (
    <div className="flex flex-col gap-8">
      <h2 className="text-center font-display text-[clamp(1.6rem,4vw,2.8rem)] font-bold">{t("finalTitle")}</h2>
      {players.length === 0 ? (
        <p className="text-center text-muted-foreground">{t("noPlayers")}</p>
      ) : (
        <div className="flex items-end justify-center gap-3 sm:gap-6">
          {place(second, "🥈", "h-28", "bg-cyan/40")}
          {place(first, "🥇", "h-40", "bg-amber/60")}
          {place(third, "🥉", "h-20", "bg-pink/40")}
        </div>
      )}
      {players.length > 3 && (
        <ol start={4} className="mx-auto flex w-full max-w-xl flex-col gap-1.5">
          {players.slice(3).map((p, i) => (
            <li key={p.name} className="flex items-center gap-3 rounded-xl border border-line bg-panel px-4 py-2">
              <span className="w-6 font-mono text-muted-foreground">{i + 4}</span>
              <span className="flex-1 font-semibold">{p.name}</span>
              <span className="font-mono text-cyan">{p.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
