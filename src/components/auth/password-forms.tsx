"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { requestPasswordReset, updatePassword } from "@/features/auth/actions";
import { Field, FormError, SubmitButton, TextInput } from "./form-parts";

/** «Құпия сөзді ұмыттым»: email → хат (тіркелу формасындағы «Поштаңызды тексеріңіз» сияқты) */
export function ForgotPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(requestPasswordReset, null);

  if (state?.checkEmail) {
    return (
      <div role="status" className="rounded-2xl border border-cyan-dim bg-linear-135 from-task-a to-task-b p-4 text-center">
        <p className="font-display font-semibold">{t("checkEmailTitle")}</p>
        <p className="mt-1 text-[0.9rem] text-muted-foreground">{t("resetSentText", { email: state.checkEmail })}</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <Field id="forgot-email" label={t("email")}>
        <TextInput id="forgot-email" name="email" type="email" autoComplete="email" required />
      </Field>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <SubmitButton>{t("sendReset")}</SubmitButton>
    </form>
  );
}

/** Хаттағы сілтемеден кейін: жаңа құпия сөз екі рет */
export function ResetPasswordForm() {
  const t = useTranslations("Auth");
  const locale = useLocale();
  const [state, action] = useActionState(updatePassword, null);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="locale" value={locale} />
      <Field id="reset-password" label={t("newPassword")} hint={t("passwordHint")}>
        <TextInput id="reset-password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field id="reset-confirm" label={t("confirmPassword")}>
        <TextInput id="reset-confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <FormError message={state?.error ? t(`errors.${state.error}`) : undefined} />
      <SubmitButton>{t("savePassword")}</SubmitButton>
    </form>
  );
}
