"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Field, FormError, SubmitButton, TextInput, inputClass } from "@/components/auth/form-parts";
import { createAssignment, createClass, joinClass, type TeacherFormState } from "@/features/teacher/actions";

const GRADES = [7, 8, 9, 10, 11] as const;

function useErrorText(state: TeacherFormState) {
  const t = useTranslations("Teacher.errors");
  return state?.error ? t(state.error) : undefined;
}

/** Жаңа сынып ашу */
export function CreateClassForm() {
  const t = useTranslations("Teacher");
  const [state, action] = useActionState(createClass, null);
  const error = useErrorText(state);

  return (
    <form action={action} className="flex flex-col gap-3">
      <Field id="class-name" label={t("className")}>
        <TextInput id="class-name" name="name" maxLength={40} placeholder="8А" required />
      </Field>
      <Field id="class-grade" label={t("grade")}>
        <select id="class-grade" name="grade" defaultValue="8" className={inputClass}>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {t("gradeN", { n: g })}
            </option>
          ))}
        </select>
      </Field>
      <FormError message={error} />
      <SubmitButton>{t("createClass")}</SubmitButton>
    </form>
  );
}

/** Сыныпқа тапсырма беру: тест + мерзім */
export function AssignmentForm({ classId, exams }: { classId: string; exams: { id: string; title: string }[] }) {
  const t = useTranslations("Teacher");
  const [state, action] = useActionState(createAssignment, null);
  const error = useErrorText(state);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="classId" value={classId} />
      <Field id="assignment-exam" label={t("assignmentExam")}>
        <select id="assignment-exam" name="examId" className={inputClass}>
          {exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
      </Field>
      <Field id="assignment-title" label={t("assignmentTitle")} hint={t("assignmentTitleHint")}>
        <TextInput id="assignment-title" name="title" maxLength={120} />
      </Field>
      <Field id="assignment-due" label={t("assignmentDue")}>
        <TextInput id="assignment-due" name="due" type="date" />
      </Field>
      <FormError message={error} />
      <SubmitButton>{t("assign")}</SubmitButton>
    </form>
  );
}

/** Оқушы 6 санды кодпен сыныпқа қосылады */
export function JoinClassForm() {
  const t = useTranslations("Teacher");
  const [state, action] = useActionState(joinClass, null);
  const error = useErrorText(state);

  return (
    <form action={action} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <label htmlFor="join-code" className="sr-only">
          {t("joinCode")}
        </label>
        <TextInput
          id="join-code"
          name="code"
          inputMode="numeric"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          placeholder="000 000"
          className="font-mono tracking-[0.15em]"
          required
        />
        <SubmitButton className="w-auto shrink-0">{t("join")}</SubmitButton>
      </div>
      <FormError message={error} />
      {state?.ok && <p className="text-[0.85rem] text-good">{t("joined")}</p>}
    </form>
  );
}
