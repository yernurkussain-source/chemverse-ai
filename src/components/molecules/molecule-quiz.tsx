"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { MOLECULES, type Molecule } from "@/lib/chemistry/molecules";
import { cn } from "@/lib/utils";
import { MoleculeViewer } from "./molecule-viewer";

const ROUNDS = 10;
const OPTIONS = 4;

type Round = { answer: Molecule; options: Molecule[] };
type Quiz = { rounds: Round[]; index: number; score: number; picked: string | null };

function shuffle<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** «Молекуланы тап»: 3D пішініне қарап, 4 атаудың ішінен дұрысын таңдау (10 сұрақ) */
export function MoleculeQuiz() {
  const t = useTranslations("MoleculesPage.quiz");
  const tm = useTranslations("Molecules");
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  function start() {
    const rounds = shuffle(MOLECULES)
      .slice(0, ROUNDS)
      .map((answer) => ({ answer, options: shuffle([answer, ...shuffle(MOLECULES.filter((m) => m.id !== answer.id)).slice(0, OPTIONS - 1)]) }));
    setQuiz({ rounds, index: 0, score: 0, picked: null });
  }

  if (!quiz) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-line bg-panel p-5">
        <p className="text-muted-foreground">{t("rules")}</p>
        <Button variant="glow" size="pill" onClick={start}>
          🎯 {t("start")}
        </Button>
      </div>
    );
  }

  if (quiz.index >= ROUNDS) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-cyan-dim bg-linear-135 from-task-a to-task-b p-5" aria-live="polite">
        <p className="font-display text-2xl font-bold">
          {t("result", { score: quiz.score, total: ROUNDS })} {quiz.score >= 8 ? "🏆" : quiz.score >= 5 ? "👍" : "💪"}
        </p>
        <Button variant="glow" size="pill" onClick={start}>
          {t("again")}
        </Button>
      </div>
    );
  }

  const { answer, options } = quiz.rounds[quiz.index];
  const answered = quiz.picked !== null;
  const correct = quiz.picked === answer.id;

  function pick(id: string) {
    if (!quiz || answered) return;
    setQuiz({ ...quiz, picked: id, score: quiz.score + (id === answer.id ? 1 : 0) });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1.2fr_1fr]">
      <div className="overflow-hidden rounded-3xl border border-line bg-[radial-gradient(120%_90%_at_50%_40%,var(--stage-a)_0%,var(--panel)_55%,var(--stage-b)_100%)]">
        <MoleculeViewer molecule={answer} viewStyle="ballStick" className="aspect-square w-full" />
      </div>
      <div className="flex flex-col gap-3">
        <p className="font-mono text-[0.85rem] text-muted-foreground">
          {t("progress", { round: quiz.index + 1, total: ROUNDS, score: quiz.score })}
        </p>
        <h2 className="font-display text-xl font-bold">{t("question")}</h2>
        <div role="group" aria-label={t("question")} className="grid gap-2">
          {options.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={answered}
              onClick={() => pick(m.id)}
              className={cn(
                "min-h-12 rounded-2xl border px-4 py-2 text-left font-semibold transition-colors disabled:cursor-default",
                !answered && "border-line bg-panel hover:border-cyan-dim",
                answered && m.id === answer.id && "border-good bg-good/15",
                answered && m.id === quiz.picked && m.id !== answer.id && "border-pink bg-pink/15",
                answered && m.id !== answer.id && m.id !== quiz.picked && "border-line bg-panel opacity-60",
              )}
            >
              {tm(`${m.id}.name`)}
              {answered && <span className="ml-2 font-mono text-[0.85rem] text-muted-foreground">{m.formula}</span>}
            </button>
          ))}
        </div>
        {answered && (
          <div aria-live="polite" className="flex flex-col gap-2">
            <p className={cn("font-semibold", correct ? "text-good" : "text-pink")}>
              {correct ? t("correct") : t("wrong", { name: tm(`${answer.id}.name`) })}
            </p>
            <p className="text-[0.88rem] text-muted-foreground">{tm(`${answer.id}.description`)}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="glow" size="pill-sm" onClick={() => setQuiz({ ...quiz, index: quiz.index + 1, picked: null })}>
                {t("next")} →
              </Button>
              <Link href={`/molecules/${answer.id}`} className="self-center text-[0.85rem] font-semibold text-cyan hover:underline">
                {t("open")}
              </Link>
            </div>
          </div>
        )}
        {!answered && <p className="text-[0.82rem] text-muted-foreground">{t("hint")}</p>}
      </div>
    </div>
  );
}
