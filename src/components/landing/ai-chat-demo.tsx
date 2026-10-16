"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { Panel } from "./section";

const QUESTIONS = ["shape", "ph", "bonds"] as const;
type Question = (typeof QUESTIONS)[number];

// Мәтін емес, кілт сақталады — тіл ауысса, чат та аударылады
type ChatMessage = { id: number; role: "me" | "bot"; question: Question; typing?: boolean };

/** Алдын ала жазылған жауаптары бар AI чат демосы (нағыз AI — 6-күні) */
export function AiChatDemo() {
  const t = useTranslations("Ai.chat");
  const [log, setLog] = useState<ChatMessage[]>([]);
  const nextId = useRef(1);
  const logRef = useRef<HTMLDivElement>(null);

  // Жаңа хабарлама келгенде төменге айналдыру
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  function ask(question: Question) {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const questionId = nextId.current++;
    const answerId = nextId.current++;
    setLog((current) => [
      ...current,
      { id: questionId, role: "me", question },
      { id: answerId, role: "bot", question, typing: true },
    ]);
    window.setTimeout(
      () => setLog((current) => current.map((m) => (m.id === answerId ? { ...m, typing: false } : m))),
      reduceMotion ? 100 : 900,
    );
  }

  return (
    <Panel className="flex h-[520px] flex-col overflow-hidden p-0">
      <div className="flex items-center gap-2.5 border-b border-line px-4.5 py-3.5">
        <span className="size-[9px] rounded-full bg-good shadow-[0_0_10px_var(--good)]" aria-hidden="true" />
        <b>{t("title")}</b>
        <span className="ml-auto text-[0.82rem] text-muted-foreground">{t("language")}</span>
      </div>

      <div ref={logRef} aria-live="polite" className="flex flex-1 flex-col gap-3 overflow-y-auto p-4.5">
        <Bubble role="bot">
          {t("greeting")}
          <Source>{t("greetingNote")}</Source>
        </Bubble>
        {log.map((m) =>
          m.role === "me" ? (
            <Bubble key={m.id} role="me">
              {t(`qa.${m.question}.q`)}
            </Bubble>
          ) : m.typing ? (
            <Bubble key={m.id} role="bot">
              <span className="inline-flex gap-1" role="status" aria-label={t("typing")}>
                <i className="size-1.5 animate-blink rounded-full bg-muted-foreground" />
                <i className="size-1.5 animate-blink rounded-full bg-muted-foreground [animation-delay:.15s]" />
                <i className="size-1.5 animate-blink rounded-full bg-muted-foreground [animation-delay:.3s]" />
              </span>
            </Bubble>
          ) : (
            <Bubble key={m.id} role="bot">
              {t(`qa.${m.question}.a`)}
              <Source>{t(`qa.${m.question}.src`)}</Source>
            </Bubble>
          ),
        )}
      </div>

      <div
        role="group"
        aria-label={t("suggestionsLabel")}
        className="flex flex-wrap gap-2 border-t border-line px-4.5 py-3.5"
      >
        {QUESTIONS.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => ask(q)}
            className="min-h-9 rounded-full border border-line bg-panel-2 px-3 py-2 text-left text-[0.84rem] transition-colors hover:border-cyan-dim"
          >
            {t(`qa.${q}.q`)}
          </button>
        ))}
      </div>
    </Panel>
  );
}

function Bubble({ role, children }: { role: "me" | "bot"; children: ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[88%] rounded-2xl px-3.5 py-2.75 text-[0.93rem] whitespace-pre-line",
        role === "me"
          ? "self-end rounded-br-[4px] bg-cyan font-semibold text-on-accent"
          : "self-start rounded-bl-[4px] border border-line bg-panel-2",
      )}
    >
      {children}
    </div>
  );
}

function Source({ children }: { children: ReactNode }) {
  return <span className="mt-2 block font-mono text-[0.72rem] text-muted-foreground">{children}</span>;
}
