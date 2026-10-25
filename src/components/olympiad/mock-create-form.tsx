"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { MOCK_COUNTS, MOCK_DURATIONS } from "@/features/olympiad/mock";
import { createMock } from "@/features/olympiad/teacher-actions";

const FIELD = "h-11 rounded-xl border border-line bg-panel-2 px-3 text-foreground";

/** Мұғалім сынақ олимпиада құрастырады: автоматты не тақырыптарды өзі таңдап */
export function MockCreateForm({ classes, topics }: { classes: { id: string; name: string }[]; topics: { n: number; title: string }[] }) {
  const t = useTranslations("Olympiad.teacher.mocks");
  const [state, action, pending] = useActionState(createMock, null);
  const [mode, setMode] = useState<"auto" | "topics">("auto");

  return (
    <form action={action} className="flex flex-col gap-4 rounded-3xl border border-line bg-panel p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("class")}</span>
          <select name="classId" required className={FIELD}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("titleLabel")}</span>
          <input name="title" required maxLength={80} defaultValue={t("defaultTitle")} className={FIELD} />
        </label>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[0.9rem] font-semibold">{t("mode")}</legend>
        {(["auto", "topics"] as const).map((value) => (
          <label key={value} className="flex items-start gap-2 text-[0.92rem]">
            <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="mt-1 size-4" />
            <span>{t(`modes.${value}`)}</span>
          </label>
        ))}
      </fieldset>

      {mode === "topics" && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 text-[0.9rem] font-semibold">{t("topics")}</legend>
          <div className="grid max-h-64 gap-1 overflow-y-auto rounded-xl border border-line p-2 sm:grid-cols-2">
            {topics.map((topic) => (
              <label key={topic.n} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-[0.85rem] hover:bg-panel-2">
                <input type="checkbox" name="topics" value={topic.n} className="mt-0.5 size-4 shrink-0" />
                <span>
                  <span className="font-mono text-cyan">{topic.n}.</span> {topic.title}
                </span>
              </label>
            ))}
          </div>
          <label className="flex items-center gap-2 text-[0.9rem]">
            <span className="font-semibold">{t("count")}</span>
            <select name="count" defaultValue={10} className={FIELD}>
              {MOCK_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        </fieldset>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("duration")}</span>
          <select name="duration" defaultValue={45} className={FIELD}>
            {MOCK_DURATIONS.map((n) => (
              <option key={n} value={n}>
                {t("minutes", { n })}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("startsAt")}</span>
          <input type="datetime-local" name="startsAt" className={FIELD} />
          <span className="text-[0.78rem] text-muted-foreground">{t("startsAtHint")}</span>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glow" size="pill" disabled={pending}>
          {t("create")}
        </Button>
        <span aria-live="polite" className="text-[0.88rem]">
          {state?.ok && <span className="text-good">✓ {t("created")}</span>}
          {state?.error && <span className="text-pink">{t(`errors.${state.error}`)}</span>}
        </span>
      </div>
    </form>
  );
}
