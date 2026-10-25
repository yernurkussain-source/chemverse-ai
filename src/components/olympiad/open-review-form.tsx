"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { reviewOpenAnswer } from "@/features/olympiad/teacher-actions";

/** Мұғалім ашық жауапқа баға қояды (AI ұсынған ұпай алдын ала толтырылады) */
export function OpenReviewForm({ id, maxScore, initialScore, initialComment }: { id: string; maxScore: number; initialScore: number | null; initialComment: string | null }) {
  const t = useTranslations("Olympiad.teacher.open");
  const [state, action, pending] = useActionState(reviewOpenAnswer, null);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <label className="flex items-center gap-2 text-[0.9rem]">
        <span className="font-semibold">{t("score")}</span>
        <input
          name="score"
          type="number"
          inputMode="decimal"
          min={0}
          max={maxScore}
          step={0.5}
          required
          defaultValue={initialScore ?? ""}
          className="h-11 w-24 rounded-xl border border-line bg-panel-2 px-3 font-mono"
        />
        <span className="font-mono text-muted-foreground">/ {maxScore}</span>
      </label>
      <label className="flex flex-col gap-1 text-[0.9rem]">
        <span className="font-semibold">{t("comment")}</span>
        <textarea name="comment" rows={2} maxLength={500} defaultValue={initialComment ?? ""} className="rounded-xl border border-line bg-panel-2 px-3 py-2" />
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glow" size="pill-sm" disabled={pending}>
          {t("save")}
        </Button>
        <span aria-live="polite" className="text-[0.85rem]">
          {state?.ok && <span className="text-good">✓ {t("saved")}</span>}
          {state?.error && <span className="text-pink">{t(`errors.${state.error}`)}</span>}
        </span>
      </div>
    </form>
  );
}
