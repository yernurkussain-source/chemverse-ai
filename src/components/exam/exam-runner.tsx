"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { finishExam, saveAnswer } from "@/features/exam/actions";
import type { ExamQuestion } from "@/features/exam/queries";
import { cn } from "@/lib/utils";

type Props = {
  sessionId: string;
  title: string;
  deadline: string;
  /** Сервер уақыты: телефон сағаты қате болса да таймер дұрыс көрсетуі үшін */
  serverNow: number;
  questions: ExamQuestion[];
  initialAnswers: Record<string, string[]>;
};

const pad = (n: number) => String(n).padStart(2, "0");

function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

type Option = ExamQuestion["options"][number];

/** Нұсқаны басқанда жаңа жауап: бір жауапты — ауыстыру, бірнеше жауап — қосу/алу, сәйкестендіру — жолдағысын ауыстыру */
function nextChoice(question: ExamQuestion, current: string[], option: Option): string[] {
  if (current.includes(option.id)) return current.filter((id) => id !== option.id); // қайта басса — алып тастау
  if (question.kind === "multiple") return [...current, option.id];
  if (question.kind === "matching") {
    const sameSlot = new Set(question.options.filter((o) => o.slot === option.slot).map((o) => o.id));
    return [...current.filter((id) => !sameSlot.has(id)), option.id];
  }
  return [option.id];
}

/** ҰБТ тесті: таймер, сұрақтар торы, жауап таңдау. Бағалау — тек серверде */
export function ExamRunner({ sessionId, title, deadline, serverNow, questions, initialAnswers }: Props) {
  const t = useTranslations("Exam");
  const locale = useLocale();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [saveError, setSaveError] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [, startTransition] = useTransition();
  const finishRef = useRef<HTMLFormElement>(null);
  const finishedRef = useRef(false);
  const pendingSaves = useRef(0);

  // Сақтаулар кезекпен жүреді: жауап сақталып жатқанда бетті жапса/жаңартса, браузер ескертеді (әйтпесе жауап жоғалады)
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (pendingSaves.current > 0) event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    finishRef.current?.requestSubmit();
  }, []);

  // Таймер: сервер мен құрылғы сағатының айырмасын ескереміз
  useEffect(() => {
    const offset = serverNow - Date.now();
    const end = new Date(deadline).getTime();
    const tick = () => {
      const left = end - (Date.now() + offset);
      setRemaining(left);
      if (left <= 0) finish();
    };
    const first = window.setTimeout(tick, 0);
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(timer);
    };
  }, [deadline, serverNow, finish]);

  const question = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id]?.length).length;
  const unanswered = questions.length - answeredCount;
  const lowTime = remaining !== null && remaining < 5 * 60_000;

  function choose(option: Option) {
    const questionId = question.id;
    const previous = answers[questionId];
    const next = nextChoice(question, previous ?? [], option);
    setAnswers((current) => {
      const copy = { ...current };
      if (next.length) copy[questionId] = next;
      else delete copy[questionId];
      return copy;
    });
    pendingSaves.current += 1;
    startTransition(async () => {
      const result = await saveAnswer(sessionId, questionId, next).finally(() => {
        pendingSaves.current -= 1;
      });
      if (result.ok) {
        setSaveError(false);
        return;
      }
      if (result.error === "expired") {
        finish();
        return;
      }
      // Сақталмады — бұрынғы жауапты қайтарамыз
      setSaveError(true);
      setAnswers((current) => {
        const copy = { ...current };
        if (previous) copy[questionId] = previous;
        else delete copy[questionId];
        return copy;
      });
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Жоғарғы жолақ: атауы, прогресс, таймер */}
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 -mx-4 flex items-center justify-between gap-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border">
        <div className="min-w-0">
          <p className="truncate text-[0.8rem] text-muted-foreground">{title}</p>
          <p className="font-mono text-[0.9rem] font-semibold">
            {t("answered", { count: answeredCount, total: questions.length })}
          </p>
        </div>
        <p
          role="timer"
          aria-label={t("timeLeft")}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 font-mono text-lg font-semibold tabular-nums",
            lowTime ? "border-pink/60 bg-pink/10 text-pink" : "border-cyan-dim text-cyan",
          )}
        >
          {remaining === null ? "--:--" : formatRemaining(remaining)}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        {/* Сұрақ */}
        <section aria-labelledby="question-title" className="rounded-3xl border border-line bg-panel p-5 sm:p-7">
          <p className="mb-2 flex flex-wrap items-center gap-2 text-[0.8rem] text-muted-foreground">
            <span className="font-mono font-semibold text-cyan">
              {t("questionOf", { n: index + 1, total: questions.length })}
            </span>
            <span className="rounded-full border border-line px-2 py-0.5">{t(`kinds.${question.context ? "context" : question.kind}`)}</span>
            {question.topic && <span>· {question.topic}</span>}
          </p>
          {question.context && (
            <div className="mb-5 rounded-2xl border border-line bg-panel-2 p-4">
              <p className="mb-1.5 font-semibold">{question.context.title}</p>
              <p className="text-[0.92rem] leading-relaxed whitespace-pre-line text-muted-foreground">{question.context.body}</p>
            </div>
          )}
          <h2 id="question-title" className="mb-2 font-sans text-[1.08rem] leading-relaxed font-semibold">
            {question.body}
          </h2>
          {question.kind !== "single" && (
            <p className="text-[0.85rem] text-muted-foreground">{t(question.kind === "multiple" ? "hintMultiple" : "hintMatching")}</p>
          )}
          {question.kind === "matching" ? (
            <div className="mt-4 flex flex-col gap-5">
              {question.items.map((item, slot) => (
                <fieldset key={slot}>
                  <legend className="mb-2 flex gap-2 font-semibold">
                    <span className="font-mono text-cyan">{"AB"[slot] ?? slot + 1})</span>
                    <span>{item}</span>
                  </legend>
                  <OptionList
                    options={question.options.filter((o) => o.slot === slot)}
                    selected={answers[question.id] ?? []}
                    onChoose={choose}
                    showLabel={false}
                  />
                </fieldset>
              ))}
            </div>
          ) : (
            <div className="mt-5">
              <OptionList options={question.options} selected={answers[question.id] ?? []} onChoose={choose} square={question.kind === "multiple"} />
            </div>
          )}
          {saveError && (
            <p role="alert" className="mt-3 text-[0.85rem] text-pink">
              {t("saveError")}
            </p>
          )}
          <div className="mt-6 flex justify-between gap-2">
            <Button
              type="button"
              variant="panel"
              size="pill-sm"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              ← {t("prev")}
            </Button>
            {index < questions.length - 1 ? (
              <Button type="button" variant="glow" size="pill-sm" onClick={() => setIndex((i) => i + 1)}>
                {t("next")} →
              </Button>
            ) : (
              <Button type="button" variant="glow" size="pill-sm" onClick={() => setConfirming(true)}>
                {t("finish")}
              </Button>
            )}
          </div>
        </section>

        {/* Сұрақтар торы және аяқтау */}
        <aside className="flex flex-col gap-4">
          <nav aria-label={t("navigator")} className="rounded-3xl border border-line bg-panel p-4">
            <ol className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-6">
              {questions.map((q, i) => (
                <li key={q.id}>
                  <button
                    type="button"
                    onClick={() => setIndex(i)}
                    aria-current={i === index ? "step" : undefined}
                    aria-label={t("goTo", { n: i + 1 })}
                    className={cn(
                      "grid aspect-square w-full min-w-8 place-items-center rounded-lg border font-mono text-[0.78rem] font-semibold",
                      answers[q.id]?.length ? "border-cyan-dim bg-cyan/15 text-cyan" : "border-line",
                      i === index && "outline-2 outline-offset-1 outline-cyan",
                    )}
                  >
                    {i + 1}
                  </button>
                </li>
              ))}
            </ol>
          </nav>

          <div className="rounded-3xl border border-line bg-panel p-4">
            {confirming ? (
              <div className="flex flex-col gap-3">
                <p className="text-[0.9rem]">
                  {unanswered ? t("confirmUnanswered", { count: unanswered }) : t("confirmAll")}
                </p>
                <div className="flex gap-2">
                  <Button type="button" variant="glow" size="pill-sm" onClick={finish}>
                    {t("confirmFinish")}
                  </Button>
                  <Button type="button" variant="panel" size="pill-sm" onClick={() => setConfirming(false)}>
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            ) : (
              <Button type="button" variant="panel" size="pill" className="w-full" onClick={() => setConfirming(true)}>
                {t("finish")}
              </Button>
            )}
          </div>
        </aside>
      </div>

      <form ref={finishRef} action={finishExam} hidden>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="sessionId" value={sessionId} />
      </form>
    </div>
  );
}

/** Жауап нұсқалары: шеңбер — бір жауап, шаршы — бірнеше жауап (белгілеу) */
function OptionList({
  options,
  selected,
  onChoose,
  square = false,
  showLabel = true,
}: {
  options: Option[];
  selected: string[];
  onChoose: (option: Option) => void;
  square?: boolean;
  showLabel?: boolean;
}) {
  return (
    <ul className="flex flex-col gap-2.5">
      {options.map((option) => {
        const isSelected = selected.includes(option.id);
        return (
          <li key={option.id}>
            <button
              type="button"
              onClick={() => onChoose(option)}
              aria-pressed={isSelected}
              className={cn(
                "flex min-h-12 w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-colors",
                isSelected ? "border-cyan bg-cyan/10" : "border-line bg-panel-2 hover:border-cyan-dim",
              )}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center border font-mono text-[0.9rem] font-semibold",
                  square ? "rounded-lg" : "rounded-full",
                  isSelected ? "border-cyan bg-cyan text-on-accent" : "border-line",
                )}
              >
                {showLabel ? option.label : isSelected ? "✓" : ""}
              </span>
              <span>{option.body}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
