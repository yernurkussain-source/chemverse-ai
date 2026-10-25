"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import type { CheckResponse } from "@/app/api/olympiad/check/route";
import { Button, buttonVariants } from "@/components/ui/button";
import { splitEq } from "@/features/olympiad/core";
import type { PublicProblem } from "@/features/olympiad/practice";
import { Link, useRouter } from "@/i18n/navigation";
import { HintLadder, StepReveal } from "./hint-ladder";
import { BalanceInput, EconfInput, McqInput, NumericInput, type EconfAnswer } from "./inputs";

type Answer = string | number | null | number[] | EconfAnswer;
type Status = "idle" | "checking" | "wrong" | "correct" | "revealed";
const ERRORS = ["network", "not_found", "bad_request", "not_configured"] as const;
type ErrorCode = (typeof ERRORS)[number];

function initialAnswer(p: PublicProblem): Answer {
  if (p.type === "mcq") return null;
  if (p.type === "balance") {
    const { L, R } = splitEq(p.equation!);
    return [...L, ...R].map(() => 1);
  }
  if (p.type === "econf") return { occ: {}, unpaired: 0 };
  return "";
}

/** Жауап толық енгізілді ме (тексеру батырмасы сонда ғана белсенді) */
function isReady(p: PublicProblem, a: Answer) {
  if (p.type === "numeric") return typeof a === "string" && a.trim() !== "";
  if (p.type === "mcq") return a !== null;
  if (p.type === "econf") return Object.values((a as EconfAnswer).occ).some((n) => n > 0);
  return true;
}

/** Есептер тізбегі: бір есеп → тексеру → келесі; соңында қорытынды */
export function ProblemRunner({ problems, showTopic = false }: { problems: PublicProblem[]; showTopic?: boolean }) {
  const t = useTranslations("Olympiad.summary");
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [firstTry, setFirstTry] = useState<boolean[]>([]);
  if (!problems.length) return null;

  if (index >= problems.length) {
    return (
      <section className="flex flex-col items-start gap-3 rounded-3xl border border-cyan-dim bg-panel p-6" aria-live="polite">
        <h2 className="font-display text-xl font-semibold">{t("title")}</h2>
        <p className="font-mono text-lg">{t("score", { correct: firstTry.filter(Boolean).length, total: problems.length })}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="glow"
            size="pill"
            onClick={() => {
              // Сервер жаңа seed-тер береді (генератор есептері жаңа сандармен)
              setIndex(0);
              setFirstTry([]);
              router.refresh();
            }}
          >
            {t("again")}
          </Button>
          <Link href="/olympiad/mistakes" className={buttonVariants({ variant: "panel", size: "pill" })}>
            {t("toMistakes")}
          </Link>
        </div>
      </section>
    );
  }

  const problem = problems[index];
  return (
    <ProblemCard
      key={problem.key}
      problem={problem}
      n={index + 1}
      total={problems.length}
      showTopic={showTopic}
      onNext={(ok) => {
        setFirstTry((list) => [...list, ok]);
        setIndex((i) => i + 1);
      }}
    />
  );
}

function ProblemCard({ problem, n, total, showTopic, onNext }: { problem: PublicProblem; n: number; total: number; showTopic: boolean; onNext: (firstTryCorrect: boolean) => void }) {
  const t = useTranslations("Olympiad.problem");
  const tRoot = useTranslations("Olympiad");
  const [answer, setAnswer] = useState<Answer>(() => initialAnswer(problem));
  const [hints, setHints] = useState(0);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [error, setError] = useState<ErrorCode | null>(null);
  const [firstTryCorrect, setFirstTryCorrect] = useState<boolean | null>(null);
  const finished = status === "correct" || status === "revealed";
  const busy = status === "checking";

  async function send(reveal: boolean) {
    const before = status;
    setStatus("checking");
    setError(null);
    const target = problem.problemId ? { problemId: problem.problemId } : { generator: problem.generator, seed: problem.seed };
    try {
      const response = await fetch("/api/olympiad/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...target, answer: reveal ? undefined : answer, reveal, hintsUsed: hints }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError((ERRORS as readonly string[]).includes(data.error) ? data.error : "network");
        setStatus(before);
        return;
      }
      const checked = data as CheckResponse;
      if (firstTryCorrect === null) setFirstTryCorrect(!reveal && checked.ok);
      setResult(checked);
      setStatus(checked.ok ? "correct" : reveal ? "revealed" : "wrong");
    } catch {
      setError("network");
      setStatus(before);
    }
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!finished && !busy && isReady(problem, answer)) void send(false);
  }

  const aiQuestion =
    t("aiPrompt", { kk: problem.kk }) + (hints ? `\n\n${t("aiHints", { hints: problem.hints.slice(0, hints).join(" ") })}` : "");

  return (
    <section aria-labelledby={`problem-${problem.key}`} className="rounded-3xl border border-line bg-panel p-5 sm:p-7">
      <p className="mb-3 flex flex-wrap items-center gap-2 text-[0.8rem] text-muted-foreground">
        <span className="font-mono font-semibold text-cyan">{t("progress", { n, total })}</span>
        <span className="rounded-full border border-line px-2 py-0.5">{t("level", { level: problem.level })}</span>
        {problem.generator && <span className="rounded-full bg-pink/15 px-2 py-0.5 font-semibold text-pink">{t("generated")}</span>}
        {showTopic && (
          <Link href={`/olympiad/topic/${problem.topic}`} className="hover:text-cyan hover:underline">
            {tRoot("topicN", { n: problem.topic })}
          </Link>
        )}
      </p>
      <h2 id={`problem-${problem.key}`} className="mb-5 font-sans text-[1.05rem] leading-relaxed font-semibold whitespace-pre-line">
        {problem.kk}
      </h2>

      <form onSubmit={onSubmit} className="flex flex-col gap-5">
        {problem.type === "numeric" && <NumericInput value={answer as string} unit={problem.unit} disabled={finished} onChange={setAnswer} />}
        {problem.type === "mcq" && <McqInput choices={problem.choices ?? []} value={answer as number | null} disabled={finished} onChange={setAnswer} />}
        {problem.type === "balance" && <BalanceInput equation={problem.equation ?? ""} value={answer as number[]} disabled={finished} onChange={setAnswer} />}
        {problem.type === "econf" && <EconfInput value={answer as EconfAnswer} disabled={finished} onChange={setAnswer} />}

        <div aria-live="polite" className="flex flex-col gap-2 empty:hidden">
          {status === "correct" && (
            <p className="rounded-2xl border border-good/40 bg-good/10 px-4 py-3 font-semibold text-good">✓ {t("correct")}</p>
          )}
          {status === "wrong" && (
            <p className="rounded-2xl border border-pink/40 bg-pink/10 px-4 py-3 text-pink">
              <span className="font-semibold">{t("wrong")}</span>
              {/* Жалпы «Жауап дұрыс емес» себебін қайталамаймыз — тек нақты себеп (атомдар, бірлік, т.б.) */}
              {result?.reason && result.reason !== "Жауап дұрыс емес" && <span>: {result.reason}</span>}. {t("tryAgain")}
            </p>
          )}
          {status === "revealed" && <p className="rounded-2xl border border-line bg-panel-2 px-4 py-3 text-muted-foreground">{t("revealed")}</p>}
          {error && (
            <p role="alert" className="text-[0.9rem] text-pink">
              {t(`errors.${error}`)}
            </p>
          )}
          {result?.mastery != null && <p className="font-mono text-[0.85rem] text-muted-foreground">{t("masteryNow", { value: Math.round(result.mastery) })}</p>}
        </div>

        {!finished && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="glow" size="pill" disabled={busy || !isReady(problem, answer)}>
              {busy ? t("checking") : t("check")}
            </Button>
            {status === "wrong" && (
              <Button type="button" variant="panel" size="pill-sm" disabled={busy} onClick={() => void send(true)} title={t("revealNote")}>
                {t("reveal")}
              </Button>
            )}
          </div>
        )}
      </form>

      {!finished && (
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
          <HintLadder hints={problem.hints} opened={hints} onOpen={() => setHints((h) => h + 1)} />
          <Link
            href={{ pathname: "/ai-tutor", query: { mode: "socratic", q: aiQuestion } }}
            target="_blank"
            rel="noopener"
            className="self-start text-[0.9rem] font-semibold text-cyan hover:underline"
          >
            ✨ {t("askAi")} ↗
          </Link>
        </div>
      )}

      {finished && result?.solution && (
        <div className="mt-5 flex flex-col gap-3 border-t border-line pt-4">
          <h3 className="font-display font-semibold">{t("solution")}</h3>
          <StepReveal steps={result.solution} />
        </div>
      )}

      {finished && (
        <Button type="button" variant="glow" size="pill" className="mt-5" onClick={() => onNext(firstTryCorrect === true)}>
          {n < total ? `${t("next")} →` : t("finish")}
        </Button>
      )}
    </section>
  );
}
