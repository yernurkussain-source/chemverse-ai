"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { TutorMode } from "@/lib/ai/prompt";
import { cn } from "@/lib/utils";
import { Markdown } from "./markdown";

const STARTERS = ["molarMass", "bonds", "ph"] as const;
const KNOWN_ERRORS = ["not_configured", "unauthorized", "rate_limited", "too_long", "bad_request", "ai_error"] as const;
type KnownError = (typeof KNOWN_ERRORS)[number];

const errorCode = (error: Error | undefined): KnownError | null => {
  if (!error) return null;
  const code = error.message.trim();
  return (KNOWN_ERRORS as readonly string[]).includes(code) ? (code as KnownError) : "ai_error";
};

/** AI мұғалім чаты: стриминг жауап, KaTeX формулалар, дереккөздер, сократтық режим */
export function TutorChat({ initialQuestion = "", initialMode = "explain" }: { initialQuestion?: string; initialMode?: TutorMode }) {
  const t = useTranslations("AiTutor");
  const locale = useLocale();
  const [input, setInput] = useState(initialQuestion);
  const [mode, setMode] = useState<TutorMode>(initialMode);
  const logRef = useRef<HTMLDivElement>(null);

  const { messages, sendMessage, status, error, stop, setMessages, clearError } = useChat({
    transport: new DefaultChatTransport({ api: "/api/ai/chat" }),
  });
  const busy = status === "submitted" || status === "streaming";
  const code = errorCode(error);

  // Жаңа мәтін келгенде төменге айналдыру
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    clearError();
    void sendMessage({ text: question }, { body: { mode, locale } });
    setInput("");
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  // Enter — жіберу, Shift+Enter — жаңа жол
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send(input);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-11.5rem-env(safe-area-inset-bottom))] min-h-[480px] flex-col overflow-hidden rounded-3xl border border-line bg-panel shadow-[0_1px_2px_var(--shadow)] lg:h-[calc(100dvh-10rem)] dark:shadow-none">
      {/* Режим ауыстырғыш */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div role="radiogroup" aria-label={t("modeLabel")} className="flex rounded-full border border-line bg-panel-2 p-1">
          {(["explain", "socratic"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={mode === value}
              onClick={() => setMode(value)}
              className={cn(
                "min-h-9 rounded-full px-3.5 text-[0.82rem] font-semibold transition-colors",
                mode === value ? "bg-cyan text-on-accent" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`modes.${value}`)}
            </button>
          ))}
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              stop();
              setMessages([]);
              clearError();
            }}
            className="min-h-9 rounded-full px-3 text-[0.82rem] font-semibold text-muted-foreground hover:text-foreground"
          >
            {t("newChat")}
          </button>
        )}
      </div>

      {/* Хабарламалар */}
      <div ref={logRef} aria-live="polite" className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-4 text-center">
            <p className="text-muted-foreground">{t(mode === "socratic" ? "emptySocratic" : "empty")}</p>
            <ul className="flex w-full flex-col gap-2">
              {STARTERS.map((key) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => send(t(`starters.${key}`))}
                    className="min-h-11 w-full rounded-2xl border border-line bg-panel-2 px-4 py-2.5 text-left text-[0.9rem] hover:border-cyan-dim"
                  >
                    {t(`starters.${key}`)}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <ol className="flex flex-col gap-4">
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {status === "submitted" && (
              <li className="self-start rounded-2xl bg-panel-2 px-4 py-3 text-[0.9rem] text-muted-foreground">{t("thinking")}</li>
            )}
          </ol>
        )}

        {code && (
          <div role="alert" className="mt-4 rounded-2xl border border-pink/40 bg-pink/10 px-4 py-3 text-[0.9rem] text-pink">
            {t(`errors.${code}`)}
            {code === "unauthorized" && (
              <Link href="/demo" className="ml-2 font-semibold underline">
                {t("demoLink")}
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Сұрақ жазу */}
      <form onSubmit={onSubmit} className="flex items-end gap-2 border-t border-line p-3">
        <label htmlFor="tutor-input" className="sr-only">
          {t("inputLabel")}
        </label>
        <textarea
          id="tutor-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          rows={Math.min(5, Math.max(1, input.split("\n").length))}
          maxLength={2000}
          placeholder={t("placeholder")}
          className="max-h-40 min-h-11 flex-1 resize-none rounded-2xl border border-line bg-panel-2 px-4 py-2.5 text-foreground placeholder:text-muted-foreground/70"
        />
        {busy ? (
          <Button type="button" variant="panel" size="pill" onClick={() => stop()}>
            {t("stop")}
          </Button>
        ) : (
          <Button type="submit" variant="glow" size="pill" disabled={!input.trim()}>
            {t("send")}
          </Button>
        )}
      </form>
      <p className="px-4 pb-3 text-center text-[0.72rem] text-muted-foreground">{t("disclaimer")}</p>
    </div>
  );
}

function ChatMessage({ message }: { message: UIMessage }) {
  const t = useTranslations("AiTutor");
  const isUser = message.role === "user";
  const sources = message.parts.filter((p) => p.type === "source-document");

  if (isUser) {
    const text = message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
    return (
      <li className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-cyan px-4 py-2.5 whitespace-pre-wrap text-on-accent">{text}</li>
    );
  }

  return (
    <li className="flex max-w-full flex-col gap-2 self-start sm:max-w-[92%]">
      <div className="rounded-2xl rounded-bl-md bg-panel-2 px-4 py-3 text-[0.95rem]">
        {message.parts.map((part, i) => {
          if (part.type === "text") return <Markdown key={i}>{part.text}</Markdown>;
          // Молярлық масса — AI емес, біздің код есептеді
          if (part.type === "tool-molarMass" && part.state === "output-available") {
            const output = part.output as { formula?: string; molarMass?: number; error?: string };
            if (!output.molarMass) return null;
            return (
              <p key={i} className="my-2 inline-flex flex-wrap items-center gap-1.5 rounded-full border border-good/50 bg-good/10 px-3 py-1 font-mono text-[0.8rem] text-good">
                ✓ M({output.formula}) = {output.molarMass} {t("gPerMol")} · {t("computed")}
              </p>
            );
          }
          return null;
        })}
      </div>
      {sources.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[0.76rem] text-muted-foreground">
          <span>{t("sources")}:</span>
          {sources.map((s) => (
            <span key={s.sourceId} className="rounded-full border border-line px-2 py-0.5 font-mono">
              [{s.sourceId}] {s.title}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}
