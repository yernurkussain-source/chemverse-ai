"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useLocale, useTranslations } from "next-intl";
import { Field, FormError, TextInput, inputClass } from "@/components/auth/form-parts";
import { Button } from "@/components/ui/button";
import { generateLessonPlan } from "@/features/lesson-studio/actions";
import { LESSON_DURATIONS, LESSON_TYPES } from "@/features/lesson-studio/schema";

const GRADES = [7, 8, 9, 10, 11] as const;

/** ҚМЖ генераторының формасы */
export function StudioForm() {
  const t = useTranslations("LessonStudio");
  const tTeacher = useTranslations("Teacher");
  const locale = useLocale();
  const [state, action] = useActionState(generateLessonPlan, null);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="locale" value={locale} />
      <Field id="studio-topic" label={t("topic")}>
        <TextInput id="studio-topic" name="topic" maxLength={150} placeholder={t("topicPlaceholder")} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="studio-grade" label={t("grade")}>
          <select id="studio-grade" name="grade" defaultValue="8" className={inputClass}>
            {GRADES.map((g) => (
              <option key={g} value={g}>
                {tTeacher("gradeN", { n: g })}
              </option>
            ))}
          </select>
        </Field>
        <Field id="studio-duration" label={t("duration")}>
          <select id="studio-duration" name="duration" defaultValue="40" className={inputClass}>
            {LESSON_DURATIONS.map((d) => (
              <option key={d} value={d}>
                {t("minutes", { count: d })}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field id="studio-type" label={t("type")}>
        <select id="studio-type" name="type" defaultValue="new" className={inputClass}>
          {LESSON_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`types.${type}`)}
            </option>
          ))}
        </select>
      </Field>
      <Field id="studio-notes" label={t("notes")} hint={t("notesHint")}>
        <textarea id="studio-notes" name="notes" maxLength={600} rows={3} className={`${inputClass} resize-y`} />
      </Field>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <GenerateButton />
    </form>
  );
}

function GenerateButton() {
  const t = useTranslations("LessonStudio");
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-1.5">
      <Button type="submit" variant="glow" size="pill" disabled={pending} className="w-full">
        {pending ? t("generating") : t("generate")}
      </Button>
      {pending && <p className="text-center text-[0.8rem] text-muted-foreground">{t("generatingHint")}</p>}
    </div>
  );
}
