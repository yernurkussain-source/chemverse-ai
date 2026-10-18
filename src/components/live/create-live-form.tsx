"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Field, FormError, SubmitButton, inputClass } from "@/components/auth/form-parts";
import { createLiveSession } from "@/features/live/actions";

const COUNTS = [5, 10, 15] as const;
const SECONDS = [15, 20, 30] as const;

/** Live сессия ашу: тест, сұрақ саны, бір сұраққа уақыт */
export function CreateLiveForm({ exams }: { exams: { id: string; title: string }[] }) {
  const t = useTranslations("LiveClass");
  const locale = useLocale();
  const [state, action] = useActionState(createLiveSession, null);

  return (
    <form action={action} className="flex flex-col gap-3.5">
      <input type="hidden" name="locale" value={locale} />
      <Field id="live-exam" label={t("exam")}>
        <select id="live-exam" name="examId" className={inputClass}>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field id="live-count" label={t("count")}>
          <select id="live-count" name="count" defaultValue="5" className={inputClass}>
            {COUNTS.map((n) => (
              <option key={n} value={n}>
                {t("countN", { count: n })}
              </option>
            ))}
          </select>
        </Field>
        <Field id="live-seconds" label={t("seconds")}>
          <select id="live-seconds" name="seconds" defaultValue="20" className={inputClass}>
            {SECONDS.map((n) => (
              <option key={n} value={n}>
                {t("secondsN", { count: n })}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <SubmitButton>{t("create")}</SubmitButton>
    </form>
  );
}
