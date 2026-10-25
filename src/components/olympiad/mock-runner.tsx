"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useCountdown } from "@/features/live/use-live-state";
import { submitMock } from "@/features/olympiad/mock-actions";
import type { PublicProblem } from "@/features/olympiad/practice";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { AnswerInput, initialAnswer, isReady, type Answer } from "./inputs";

const formatRemaining = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

/** Сынақ олимпиада: барлық есеп, таймер (сервердің басталу уақытынан), соңында бір рет тапсыру */
export function MockRunner({ mockId, problems, startedAt, durationMin, serverNow }: { mockId: string; problems: PublicProblem[]; startedAt: string; durationMin: number; serverNow: number }) {
  const t = useTranslations("Olympiad.mock");
  const router = useRouter();
  const storageKey = `olympiad-mock:${mockId}`;
  const [answers, setAnswers] = useState<Record<string, Answer>>(() => Object.fromEntries(problems.map((p) => [p.key, initialAnswer(p)])));
  const [index, setIndex] = useState(0);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();
  const restored = useRef(false);
  const autoSubmitted = useRef(false);
  const remaining = useCountdown(startedAt, durationMin * 60, serverNow);

  // Бет жаңарса не байланыс үзілсе, жауаптар жоғалмауы үшін — құрылғыда сақталады
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        const saved = window.sessionStorage.getItem(storageKey);
        if (saved) setAnswers((current) => ({ ...current, ...(JSON.parse(saved) as Record<string, Answer>) }));
      } catch {
        // sessionStorage жабық — жаңадан бастаймыз
      }
      restored.current = true;
    }, 0);
    return () => window.clearTimeout(id);
  }, [storageKey]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.sessionStorage.setItem(storageKey, JSON.stringify(answers));
    } catch {
      // сақтау мүмкін емес — маңызды емес
    }
  }, [answers, storageKey]);

  function finish() {
    setError(false);
    const payload = Object.fromEntries(problems.filter((p) => isReady(p, answers[p.key])).map((p) => [p.key, answers[p.key]]));
    startTransition(async () => {
      const result = await submitMock(mockId, payload);
      if (!result.ok) {
        setError(true);
        return;
      }
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // маңызды емес
      }
      router.refresh();
    });
  }

  // Уақыт бітсе — автоматты тапсыру
  useEffect(() => {
    if (remaining === 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      finish();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- тек уақыт біткенде бір рет
  }, [remaining]);

  const problem = problems[index];
  const answered = problems.filter((p) => isReady(p, answers[p.key])).length;
  const lowTime = remaining !== null && remaining <= 60;

  return (
    <div className="flex flex-col gap-4">
      <div className="sticky top-[calc(env(safe-area-inset-top)+3.5rem)] z-10 -mx-4 flex items-center justify-between gap-3 border-b border-line bg-ink/90 px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border">
        <p className="font-mono text-[0.9rem] font-semibold">{t("answered", { count: answered, total: problems.length })}</p>
        <p
          role="timer"
          aria-label={t("timeLeft")}
          className={cn(
            "rounded-full border px-3.5 py-1.5 font-mono text-lg font-semibold tabular-nums",
            lowTime ? "border-pink/60 bg-pink/10 text-pink" : "border-cyan-dim text-cyan",
          )}
        >
          {remaining === null ? "--:--" : formatRemaining(remaining)}
        </p>
      </div>

      <section aria-labelledby={`mock-${problem.key}`} className="rounded-3xl border border-line bg-panel p-5 sm:p-7">
        <p className="mb-3 font-mono text-[0.8rem] font-semibold text-cyan">{t("problemOf", { n: index + 1, total: problems.length, points: problem.level })}</p>
        <h2 id={`mock-${problem.key}`} className="mb-5 font-sans text-[1.05rem] leading-relaxed font-semibold whitespace-pre-line">
          {problem.kk}
        </h2>
        <AnswerInput
          key={problem.key}
          problem={problem}
          answer={answers[problem.key]}
          disabled={pending}
          onChange={(value) => setAnswers((current) => ({ ...current, [problem.key]: value }))}
        />
        <div className="mt-6 flex justify-between gap-2">
          <Button type="button" variant="panel" size="pill-sm" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
            ← {t("prev")}
          </Button>
          {index < problems.length - 1 ? (
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

      <nav aria-label={t("navigator")} className="rounded-3xl border border-line bg-panel p-4">
        <ol className="grid grid-cols-6 gap-1.5 sm:grid-cols-10">
          {problems.map((p, i) => (
            <li key={p.key}>
              <button
                type="button"
                onClick={() => setIndex(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={t("goTo", { n: i + 1 })}
                className={cn(
                  "grid aspect-square w-full min-w-10 place-items-center rounded-lg border font-mono text-[0.85rem] font-semibold",
                  isReady(p, answers[p.key]) ? "border-cyan-dim bg-cyan/15 text-cyan" : "border-line",
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
            <p className="text-[0.9rem]">{answered < problems.length ? t("confirmUnanswered", { count: problems.length - answered }) : t("confirmAll")}</p>
            <div className="flex gap-2">
              <Button type="button" variant="glow" size="pill-sm" disabled={pending} onClick={finish}>
                {pending ? t("sending") : t("confirmFinish")}
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
        {error && (
          <p role="alert" className="mt-3 text-[0.9rem] text-pink">
            {t("submitError")}
          </p>
        )}
      </div>
    </div>
  );
}
