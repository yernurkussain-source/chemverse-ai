"use client";

import { useActionState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { demoLogin } from "@/features/auth/actions";
import { BookIcon, UserIcon } from "@/components/layout/nav-icons";
import { FormError } from "./form-parts";

/** Екі үлкен батырма: оқушы немесе мұғалім болып бір басумен кіру */
export function DemoButtons() {
  const t = useTranslations("Demo");
  const tAuth = useTranslations("Auth");
  const locale = useLocale();
  const [state, action, pending] = useActionState(demoLogin, null);

  const options = [
    { role: "student", title: t("student"), text: t("studentText"), Icon: BookIcon },
    { role: "teacher", title: t("teacher"), text: t("teacherText"), Icon: UserIcon },
  ] as const;

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="locale" value={locale} />
      {options.map(({ role, title, text, Icon }) => (
        <button
          key={role}
          type="submit"
          name="role"
          value={role}
          disabled={pending}
          className="flex items-center gap-4 rounded-2xl border border-line bg-panel p-4 text-left transition-colors hover:border-cyan disabled:opacity-60"
        >
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-cyan text-on-accent">
            <Icon size={24} />
          </span>
          <span className="min-w-0">
            <b className="block font-display">{pending ? tAuth("pending") : title}</b>
            <span className="text-[0.85rem] text-muted-foreground">{text}</span>
          </span>
        </button>
      ))}
      <FormError message={state?.error ? tAuth(`errors.${state.error}`) : undefined} />
    </form>
  );
}
