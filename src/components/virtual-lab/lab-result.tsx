"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { FormError, SubmitButton, TextInput } from "@/components/auth/form-parts";
import type { LabOutcome } from "@/features/virtual-lab/actions";
import type { ShellLabSlug } from "@/features/virtual-lab/catalog";
import { RUBRIC } from "@/features/virtual-lab/scoring";
import { overrideConclusion } from "@/features/virtual-lab/teacher-actions";
import { LAB_MODULES } from "./modules";
import { ScoreView, type ScoreOverride } from "./score-view";

/** Нәтиже беті үшін: сақталған бағалау, оқушының қорытындысы және (мұғалімге) қорытынды ұпайын түзету */
export function LabResult({
  slug,
  outcome,
  conclusion,
  override,
  teacherView,
  attemptId,
}: {
  slug: ShellLabSlug;
  outcome: LabOutcome;
  conclusion: string;
  override: ScoreOverride | null;
  teacherView: boolean;
  attemptId: string;
}) {
  const t = useTranslations("ChemLab");
  return (
    <div className="flex flex-col gap-5">
      <ScoreView lab={LAB_MODULES[slug]} outcome={outcome} override={override} />
      {conclusion && (
        <section className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="mb-1.5 font-display font-semibold">{t("scoreView.yourConclusion")}</h2>
          <p className="leading-relaxed whitespace-pre-line">{conclusion}</p>
        </section>
      )}
      {teacherView && <OverrideForm attemptId={attemptId} current={override?.conclusion ?? outcome.breakdown.conclusion} comment={override?.comment ?? ""} />}
    </div>
  );
}

function OverrideForm({ attemptId, current, comment }: { attemptId: string; current: number; comment: string }) {
  const t = useTranslations("ChemLab");
  const [state, action] = useActionState(overrideConclusion, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-2xl border border-cyan-dim bg-cyan/5 p-4">
      <h2 className="font-display font-semibold">{t("override.title")}</h2>
      <input type="hidden" name="attemptId" value={attemptId} />
      <label className="flex flex-col gap-1.5 text-[0.85rem] text-muted-foreground">
        {t("override.score")}
        <TextInput name="score" type="number" min={0} max={RUBRIC.conclusion} step={1} defaultValue={current} required className="max-w-32 font-mono" />
      </label>
      <label className="flex flex-col gap-1.5 text-[0.85rem] text-muted-foreground">
        {t("override.comment")}
        <textarea
          name="comment"
          defaultValue={comment}
          maxLength={300}
          rows={2}
          className="w-full rounded-[10px] border border-line bg-panel-2 px-3 py-2.5 text-foreground"
        />
      </label>
      <FormError message={state?.error ? t(`teacherErrors.${state.error}`) : undefined} />
      {state?.ok && (
        <p role="status" className="text-[0.88rem] font-semibold text-good">
          ✓ {t("override.saved")}
        </p>
      )}
      <SubmitButton className="w-auto self-start">{t("override.save")}</SubmitButton>
    </form>
  );
}
