"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Field, FormError, SubmitButton, TextInput, inputClass } from "@/components/auth/form-parts";
import { SHELL_LABS } from "@/features/virtual-lab/catalog";
import { createLabAssignment } from "@/features/virtual-lab/teacher-actions";

/** /teacher/labs: тәжірибені сыныпқа тапсырма ретінде беру */
export function LabAssignmentForm({ classes }: { classes: { id: string; name: string }[] }) {
  const t = useTranslations("ChemLab");
  const [state, action] = useActionState(createLabAssignment, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <Field id="lab-class" label={t("teacherLabs.class")}>
        <select id="lab-class" name="classId" className={inputClass} required>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </Field>
      <Field id="lab-slug" label={t("teacherLabs.lab")}>
        <select id="lab-slug" name="slug" className={inputClass} required>
          {SHELL_LABS.map((slug) => (
            <option key={slug} value={slug}>
              {t(`catalog.${slug}.title`)}
            </option>
          ))}
        </select>
      </Field>
      <Field id="lab-title" label={t("teacherLabs.titleLabel")}>
        <TextInput id="lab-title" name="title" maxLength={120} />
      </Field>
      <Field id="lab-due" label={t("teacherLabs.due")}>
        <TextInput id="lab-due" name="due" type="date" />
      </Field>
      <FormError message={state?.error ? t(`teacherErrors.${state.error}`) : undefined} />
      {state?.ok && (
        <p role="status" className="text-[0.88rem] font-semibold text-good">
          ✓ {t("teacherLabs.assigned")}
        </p>
      )}
      <SubmitButton>{t("teacherLabs.assign")}</SubmitButton>
    </form>
  );
}
