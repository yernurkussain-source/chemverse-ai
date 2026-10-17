"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { login } from "@/features/auth/actions";
import { Field, FormError, SubmitButton, TextInput } from "./form-parts";

export function LoginForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(login, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <Field id="login-email" label={t("email")}>
        <TextInput id="login-email" name="email" type="email" autoComplete="email" required />
      </Field>
      <Field id="login-password" label={t("password")}>
        <TextInput id="login-password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <SubmitButton>{t("submitLogin")}</SubmitButton>
    </form>
  );
}
