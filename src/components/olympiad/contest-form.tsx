"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CONTEST_PER_ROUND, CONTEST_ROUNDS, CONTEST_SECONDS } from "@/features/olympiad/contest";
import { createContest } from "@/features/olympiad/teacher-actions";

const FIELD = "h-11 rounded-xl border border-line bg-panel-2 px-3 text-foreground";

/** Мұғалім сайысты бастайды: раундтар, әр раундтағы сұрақ саны, бір сұрақтың уақыты */
export function ContestForm() {
  const t = useTranslations("Olympiad.contest");
  const locale = useLocale();
  const [state, action, pending] = useActionState(createContest, null);
  return (
    <form action={action} className="flex flex-col gap-4 rounded-3xl border border-cyan-dim bg-panel p-5">
      <input type="hidden" name="locale" value={locale} />
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">{t("roundsLabel")}</legend>
        {CONTEST_ROUNDS.map((round) => (
          <label key={round} className="flex items-start gap-2">
            <input type="checkbox" name="rounds" value={round} defaultChecked className="mt-1 size-4" />
            <span>
              <span className="font-semibold">{t(`rounds.${round}`)}</span>
              <span className="block text-[0.85rem] text-muted-foreground">{t(`roundText.${round}`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("perRound")}</span>
          <select name="perRound" defaultValue={5} className={FIELD}>
            {CONTEST_PER_ROUND.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("seconds")}</span>
          <select name="seconds" defaultValue={30} className={FIELD}>
            {CONTEST_SECONDS.map((n) => (
              <option key={n} value={n}>
                {t("secondsValue", { n })}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glow" size="pill" disabled={pending}>
          🏆 {t("start")}
        </Button>
        <span aria-live="polite" className="text-[0.88rem] text-pink">
          {state?.error && t(`errors.${state.error}`)}
        </span>
      </div>
    </form>
  );
}
