"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { register } from "@/features/auth/actions";
import { Field, FormError, SubmitButton, TextInput } from "./form-parts";
import { GoogleSignIn } from "./google-button";

export function RegisterForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(register, null);

  // Email растау қосулы болса — хат жіберілгені туралы хабарлама
  if (state?.checkEmail) {
    return (
      <div role="status" className="rounded-2xl border border-cyan-dim bg-linear-135 from-task-a to-task-b p-4 text-center">
        <p className="font-display font-semibold">{t("checkEmailTitle")}</p>
        <p className="mt-1 text-[0.9rem] text-muted-foreground">{t("checkEmailText", { email: state.checkEmail })}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <GoogleSignIn />
      <form action={action} className="flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <Field id="register-name" label={t("fullName")}>
          <TextInput id="register-name" name="fullName" autoComplete="name" maxLength={80} required />
        </Field>
        <Field id="register-email" label={t("email")}>
          <TextInput id="register-email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field id="register-password" label={t("password")} hint={t("passwordHint")}>
          <TextInput id="register-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </Field>
        <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
        <SubmitButton>{t("submitRegister")}</SubmitButton>
      </form>
    </div>
  );
}
