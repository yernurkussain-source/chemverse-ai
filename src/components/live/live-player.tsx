"use client";

import { useActionState, useEffect, useState, useTransition, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FormError, SubmitButton, TextInput } from "@/components/auth/form-parts";
import type { StudentLiveState } from "@/app/api/live/[code]/state/route";
import { joinLive, submitLiveAnswer } from "@/features/live/actions";
import { useCountdown, useLiveState } from "@/features/live/use-live-state";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { optionStyle } from "./option-style";

type Ok = Extract<StudentLiveState, { status: "ok" }>;

/** Оқушының Live экраны (телефон): атымен қосылу → сұраққа жауап → нәтиже */
export function LivePlayer({ code }: { code: string }) {
  const t = useTranslations("LiveClass");
  const locale = useLocale();
  const { state, refetch } = useLiveState<StudentLiveState>(code, `/api/live/${code}/state?locale=${locale}`);

  if (!state) return <Center>{t("loading")}</Center>;
  if (state.status === "not_found") {
    return (
      <Center>
        <p className="text-lg">{t("notFound")}</p>
        <Link href="/join" className="font-semibold text-cyan underline">
          {t("enterOtherCode")}
        </Link>
      </Center>
    );
  }
  if (!state.me) {
    return state.phase === "finished" ? <Center>{t("alreadyFinished")}</Center> : <JoinForm code={code} onJoined={refetch} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between rounded-2xl border border-line bg-panel px-4 py-2.5">
        <span className="font-semibold">{state.me.name}</span>
        <span className="font-mono text-cyan">{t("score", { score: state.me.score })}</span>
      </div>
      {state.phase === "lobby" && (
        <Center>
          <p className="text-2xl font-bold">{t("youAreIn")}</p>
          <p className="text-muted-foreground">{t("waitTeacher")}</p>
          <p className="text-[0.9rem] text-muted-foreground">{t("players", { count: state.players })}</p>
        </Center>
      )}
      {state.phase === "question" && <AnswerScreen key={state.index} code={code} state={state} onAnswered={refetch} />}
      {state.phase === "reveal" && <RevealScreen state={state} />}
      {state.phase === "finished" && <FinalScreen state={state} />}
    </div>
  );
}

function JoinForm({ code, onJoined }: { code: string; onJoined: () => void }) {
  const t = useTranslations("LiveClass");
  const [state, action] = useActionState(joinLive, null);

  // Қосылғаннан кейін күйді қайта сұраймыз (енді «мен» белгілі)
  useEffect(() => {
    if (state?.ok) onJoined();
  }, [state, onJoined]);

  return (
    <form action={action} className="mx-auto flex w-full max-w-sm flex-col gap-3 pt-6">
      <input type="hidden" name="code" value={code} />
      <h2 className="text-center text-2xl font-bold">{t("joinTitle")}</h2>
      <p className="text-center text-muted-foreground">{t("joinHint")}</p>
      <label htmlFor="live-name" className="sr-only">
        {t("nameLabel")}
      </label>
      <TextInput
        id="live-name"
        name="name"
        maxLength={30}
        autoComplete="nickname"
        placeholder={t("namePlaceholder")}
        className="h-14 text-center text-lg"
        required
      />
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <SubmitButton className="h-14 text-lg">{t("join")}</SubmitButton>
      <p className="text-center text-[0.78rem] text-muted-foreground">{t("privacy")}</p>
    </form>
  );
}

function AnswerScreen({ code, state, onAnswered }: { code: string; state: Ok; onAnswered: () => void }) {
  const t = useTranslations("LiveClass");
  const [chosen, setChosen] = useState<string | null>(state.me?.answeredOptionId ?? null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const remaining = useCountdown(state.questionStartedAt, state.secondsPerQuestion, state.serverNow);
  const answered = chosen ?? state.me?.answeredOptionId ?? null;

  function answer(optionId: string) {
    if (answered || pending) return;
    setChosen(optionId);
    startTransition(async () => {
      const result = await submitLiveAnswer(code, optionId);
      if (!result.ok && result.error !== "already") {
        setChosen(null);
        setError(t(`answerErrors.${result.error}`));
      }
      onAnswered();
    });
  }

  if (answered) {
    const option = state.question?.options.find((o) => o.id === answered);
    return (
      <Center>
        {option && (
          <span className={cn("grid size-20 place-items-center rounded-3xl text-4xl text-on-accent", optionStyle(option.label).bg)}>
            {optionStyle(option.label).shape}
          </span>
        )}
        <p className="text-2xl font-bold">{t("answerSent")}</p>
        <p className="text-muted-foreground">{t("waitOthers")}</p>
      </Center>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-muted-foreground">{t("questionOf", { n: state.index + 1, total: state.total })}</span>
        <span className={cn("font-mono text-2xl font-bold tabular-nums", remaining !== null && remaining <= 5 ? "text-pink" : "text-cyan")}>
          {remaining ?? "–"}
        </span>
      </div>
      <p className="rounded-2xl border border-line bg-panel p-4 text-lg leading-snug font-semibold">{state.question?.body}</p>
      <div className="grid gap-2.5">
        {state.question?.options.map((o) => {
          const style = optionStyle(o.label);
          return (
            <button
              key={o.id}
              type="button"
              disabled={pending || remaining === 0}
              onClick={() => answer(o.id)}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-2xl px-4 py-3 text-left text-lg font-semibold text-on-accent transition-transform active:scale-[0.98] disabled:opacity-60",
                style.bg,
              )}
            >
              <span className="text-2xl">{style.shape}</span>
              <span>{o.body}</span>
            </button>
          );
        })}
      </div>
      {remaining === 0 && <p className="text-center text-amber">{t("timeUp")}</p>}
      {error && (
        <p role="alert" className="text-center text-pink">
          {error}
        </p>
      )}
    </div>
  );
}

function RevealScreen({ state }: { state: Ok }) {
  const t = useTranslations("LiveClass");
  const me = state.me!;
  const correct = state.question?.options.find((o) => o.id === state.correctOptionId);
  const status = me.lastCorrect === null ? "none" : me.lastCorrect ? "right" : "wrong";

  return (
    <Center>
      <p
        className={cn(
          "text-4xl font-bold",
          status === "right" ? "text-good" : status === "wrong" ? "text-pink" : "text-muted-foreground",
        )}
      >
        {t(`result.${status}`)}
      </p>
      {status === "right" && <p className="font-mono text-2xl text-good">+{me.lastPoints}</p>}
      {correct && (
        <p className="text-[0.95rem] text-muted-foreground">
          {t("correctWas")}: <b className="text-foreground">{correct.body}</b>
        </p>
      )}
      <p className="text-lg">{t("rank", { rank: me.rank, total: state.players })}</p>
    </Center>
  );
}

function FinalScreen({ state }: { state: Ok }) {
  const t = useTranslations("LiveClass");
  const me = state.me!;
  const medal = me.rank === 1 ? "🥇" : me.rank === 2 ? "🥈" : me.rank === 3 ? "🥉" : "🎉";
  return (
    <Center>
      <span className="text-6xl">{medal}</span>
      <p className="text-3xl font-bold">{t("rank", { rank: me.rank, total: state.players })}</p>
      <p className="font-mono text-xl text-cyan">{t("score", { score: me.score })}</p>
      <ol className="mt-2 flex w-full max-w-xs flex-col gap-1.5">
        {state.podium.map((p, i) => (
          <li key={p.name} className="flex justify-between rounded-xl border border-line bg-panel px-4 py-2">
            <span>
              {i + 1}. {p.name}
            </span>
            <span className="font-mono text-cyan">{p.score}</span>
          </li>
        ))}
      </ol>
      <p className="mt-2 text-muted-foreground">{t("thanks")}</p>
    </Center>
  );
}

function Center({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">{children}</div>;
}
