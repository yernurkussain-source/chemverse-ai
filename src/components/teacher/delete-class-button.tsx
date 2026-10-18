"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { deleteClass } from "@/features/teacher/actions";

/** Сыныпты жою: абайсызда басылмауы үшін алдымен растау сұрайды */
export function DeleteClassButton({ classId, name, students }: { classId: string; name: string; students: number }) {
  const t = useTranslations("Teacher");
  const locale = useLocale();
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="h-10 rounded-full border border-line px-4 text-[0.85rem] font-bold text-muted-foreground transition-colors hover:border-pink hover:text-pink"
      >
        {t("deleteClass")}
      </button>
    );
  }

  return (
    <form action={deleteClass} className="flex max-w-md flex-col gap-2.5 rounded-2xl border border-pink/40 bg-pink/10 p-4">
      <input type="hidden" name="classId" value={classId} />
      <input type="hidden" name="locale" value={locale} />
      <p className="text-[0.9rem] text-pink">{t("deleteClassConfirm", { name, count: students })}</p>
      <div className="flex gap-2">
        <button type="submit" className="h-10 flex-1 rounded-full bg-pink px-4 text-[0.85rem] font-bold text-white">
          {t("deleteClassYes")}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="h-10 flex-1 rounded-full border border-line bg-panel px-4 text-[0.85rem] font-bold"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}
