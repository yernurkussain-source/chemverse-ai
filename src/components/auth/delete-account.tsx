"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { deleteAccount } from "@/features/auth/actions";
import { FormError } from "./form-parts";

/** Профильдегі «Аккаунтты өшіру»: QR жою батырмасы сияқты алдымен растау сұрайды */
export function DeleteAccount() {
  const t = useTranslations("Profile");
  const locale = useLocale();
  const [confirming, setConfirming] = useState(false);
  const [state, action, pending] = useActionState(deleteAccount, null);

  return (
    <section className="flex flex-col gap-2 rounded-2xl border border-pink/30 p-4">
      <h2 className="text-base font-semibold">{t("deleteTitle")}</h2>
      <p className="text-[0.88rem] text-muted-foreground">{t("deleteText")}</p>
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="min-h-10 self-start rounded-full border border-line px-4 font-semibold text-muted-foreground transition-colors hover:border-pink hover:text-pink"
        >
          {t("deleteButton")}
        </button>
      ) : (
        <form action={action} className="flex flex-col gap-2 rounded-xl border border-pink/40 bg-pink/10 p-3">
          <input type="hidden" name="locale" value={locale} />
          <p className="text-pink">{t("deleteConfirm")}</p>
          <div className="flex gap-2">
            <button type="submit" disabled={pending} className="min-h-10 flex-1 rounded-full bg-pink px-3 font-semibold text-white disabled:opacity-60">
              {t("deleteYes")}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="min-h-10 flex-1 rounded-full border border-line bg-panel px-3 font-semibold"
            >
              {t("deleteCancel")}
            </button>
          </div>
        </form>
      )}
      <FormError message={state?.error === "demo" ? t("deleteDemo") : state?.error ? t("deleteFailed") : undefined} />
    </section>
  );
}
