"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { deleteQr } from "@/features/qr/actions";

/** QR-ды жою: абайсызда басылмауы үшін алдымен растау сұрайды */
export function QrDeleteButton({ id }: { id: string }) {
  const t = useTranslations("Qr");
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="min-h-9 rounded-full border border-line px-3 font-semibold text-muted-foreground transition-colors hover:border-pink hover:text-pink"
      >
        {t("delete")}
      </button>
    );
  }

  return (
    <form action={deleteQr} className="flex w-full flex-col gap-2 rounded-xl border border-pink/40 bg-pink/10 p-2.5">
      <input type="hidden" name="id" value={id} />
      <p className="text-left text-pink">{t("deleteConfirm")}</p>
      <div className="flex gap-2">
        <button type="submit" className="min-h-9 flex-1 rounded-full bg-pink px-3 font-semibold text-white">
          {t("deleteYes")}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="min-h-9 flex-1 rounded-full border border-line bg-panel px-3 font-semibold"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
