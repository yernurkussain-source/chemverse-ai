"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { saveOnboarding } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { BookIcon, UserIcon } from "@/components/layout/nav-icons";
import { Field, FormError, inputClass, SubmitButton, TextInput } from "./form-parts";

type Role = "student" | "teacher";
const GRADES = [7, 8, 9, 10, 11] as const;

export type OnboardingDefaults = {
  role: Role | null;
  fullName: string;
  school: string;
  grade: number | null;
};

export function OnboardingForm({ defaults }: { defaults: OnboardingDefaults }) {
  const t = useTranslations("Onboarding");
  const tGrades = useTranslations("Studio.grades");
  const locale = useLocale();
  const [role, setRole] = useState<Role | null>(defaults.role);
  const [state, action] = useActionState(saveOnboarding, null);

  const roles = [
    { value: "student", title: t("student"), text: t("studentText"), Icon: BookIcon },
    { value: "teacher", title: t("teacher"), text: t("teacherText"), Icon: UserIcon },
  ] as const;

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1.5 text-[0.85rem] text-muted-foreground">{t("roleLabel")}</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {roles.map(({ value, title, text, Icon }) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer flex-col gap-1.5 rounded-2xl border p-3.5 transition-colors has-focus-visible:outline-2 has-focus-visible:outline-cyan",
                role === value ? "border-cyan bg-glow-soft" : "border-line bg-panel hover:border-cyan-dim",
              )}
            >
              <input
                type="radio"
                name="role"
                value={value}
                checked={role === value}
                onChange={() => setRole(value)}
                className="sr-only"
                required
              />
              <Icon className="text-cyan" />
              <b className="font-display text-[0.95rem]">{title}</b>
              <span className="text-[0.8rem] text-muted-foreground">{text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <Field id="ob-name" label={t("fullName")}>
        <TextInput id="ob-name" name="fullName" defaultValue={defaults.fullName} maxLength={80} autoComplete="name" required />
      </Field>
      <Field id="ob-school" label={t("school")}>
        <TextInput id="ob-school" name="school" defaultValue={defaults.school} maxLength={120} />
      </Field>
      <Field id="ob-grade" label={t("grade")}>
        <select id="ob-grade" name="grade" defaultValue={defaults.grade ?? 8} className={inputClass}>
          {GRADES.map((g) => (
            <option key={g} value={g}>
              {tGrades(`g${g}`)}
            </option>
          ))}
        </select>
      </Field>

      {role === "student" && (
        <Field id="ob-code" label={t("joinCode")} hint={t("joinCodeHint")}>
          <TextInput id="ob-code" name="joinCode" inputMode="numeric" pattern="[0-9 ]{6,7}" maxLength={7} placeholder="482 913" />
        </Field>
      )}
      {role === "teacher" && (
        <Field id="ob-class" label={t("className")}>
          <TextInput id="ob-class" name="className" maxLength={40} placeholder={t("classNameHint")} />
        </Field>
      )}

      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <SubmitButton>{t("submit")}</SubmitButton>
    </form>
  );
}
