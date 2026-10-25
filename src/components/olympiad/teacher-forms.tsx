"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { createOlympiadAssignment, saveJournal, saveSchedule, updateSessionDates, type OlympiadTeacherState } from "@/features/olympiad/teacher-actions";
import { SCHOOL_YEAR_START } from "@/features/olympiad/schedule";
import { Link } from "@/i18n/navigation";

const FIELD = "h-11 rounded-xl border border-line bg-panel-2 px-3 text-foreground";

function Status({ state, ns }: { state: OlympiadTeacherState; ns: "calendar" | "journal" }) {
  const t = useTranslations(`Olympiad.teacher.${ns}`);
  const tErr = useTranslations("Olympiad.teacher.errors");
  return (
    <span aria-live="polite" className="text-[0.88rem]">
      {state?.ok && <span className="text-good">✓ {t("saved")}</span>}
      {state?.error && <span className="text-pink">{tErr(state.error)}</span>}
    </span>
  );
}

/** Күнтізбені тарату: апта күні, уақыт, басталу күні, демалыс күндері → 34 сабақ */
export function ScheduleForm({ classId }: { classId: string }) {
  const t = useTranslations("Olympiad.teacher.calendar");
  const [state, action, pending] = useActionState(saveSchedule, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-3xl border border-line bg-panel p-5">
      <input type="hidden" name="classId" value={classId} />
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("weekday")}</span>
          <select name="weekday" defaultValue={3} className={FIELD}>
            {[1, 2, 3, 4, 5, 6].map((d) => (
              <option key={d} value={d}>
                {t(`days.d${d}` as "days.d1")}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("time")}</span>
          <input type="time" name="time" required defaultValue="15:00" className={FIELD} />
        </label>
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("start")}</span>
          <input type="date" name="start" required defaultValue={SCHOOL_YEAR_START} className={FIELD} />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-[0.9rem]">
        <span className="font-semibold">{t("holidays")}</span>
        <textarea name="holidays" rows={4} placeholder={"2026-10-27 — 2026-11-02\n2026-12-16"} className="rounded-xl border border-line bg-panel-2 px-3 py-2 font-mono text-[0.9rem]" />
        <span className="text-[0.8rem] text-muted-foreground">{t("holidaysHint")}</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glow" size="pill" disabled={pending}>
          {t("generate")}
        </Button>
        <Status state={state} ns="calendar" />
      </div>
    </form>
  );
}

/** 34 сабақтың күнін қолмен жылжыту + журналға сілтеме */
export function CalendarEditor({ classId, sessions }: { classId: string; sessions: { id: string; topic: number; title: string; date: string; time: string | null }[] }) {
  const t = useTranslations("Olympiad.teacher.calendar");
  const [state, action, pending] = useActionState(updateSessionDates, null);
  return (
    <form action={action} className="flex flex-col gap-3 rounded-3xl border border-line bg-panel p-4 sm:p-5">
      <input type="hidden" name="classId" value={classId} />
      <ol className="flex flex-col divide-y divide-line">
        {sessions.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-2">
            <span className="w-7 font-mono text-[0.85rem] font-semibold text-cyan">{s.topic}</span>
            <span className="min-w-0 flex-1 basis-48 text-[0.9rem]">{s.title}</span>
            <input type="hidden" name={`was_${s.topic}`} value={s.date} />
            <input type="date" name={`date_${s.topic}`} defaultValue={s.date} aria-label={t("dateOf", { n: s.topic })} className="h-10 rounded-lg border border-line bg-panel-2 px-2 font-mono text-[0.85rem]" />
            {s.time && <span className="font-mono text-[0.8rem] text-muted-foreground">{s.time.slice(0, 5)}</span>}
            <Link href={`/teacher/olympiad/journal/${s.id}`} className="text-[0.85rem] font-semibold text-cyan hover:underline">
              {t("journal")} →
            </Link>
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glow" size="pill-sm" disabled={pending}>
          {t("saveDates")}
        </Button>
        <Status state={state} ns="calendar" />
      </div>
    </form>
  );
}

/** Журнал: қатысу және үй тапсырмасы */
export function JournalForm({
  sessionId,
  note,
  students,
}: {
  sessionId: string;
  note: string | null;
  students: { id: string; name: string; present: boolean; homework: boolean }[];
}) {
  const t = useTranslations("Olympiad.teacher.journal");
  const [state, action, pending] = useActionState(saveJournal, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="sessionId" value={sessionId} />
      <label className="flex flex-col gap-1 rounded-3xl border border-line bg-panel p-5">
        <span className="font-semibold">{t("homeworkText")}</span>
        <textarea name="note" rows={2} maxLength={1000} defaultValue={note ?? ""} className="rounded-xl border border-line bg-panel-2 px-3 py-2" />
      </label>
      {students.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel-2 px-4 py-3 text-muted-foreground">{t("noStudents")}</p>
      ) : (
        <table className="w-full rounded-3xl border border-line bg-panel text-left text-[0.92rem]">
          <thead className="text-[0.8rem] text-muted-foreground">
            <tr>
              <th className="px-4 py-2">{t("student")}</th>
              <th className="px-2 py-2 text-center">{t("present")}</th>
              <th className="px-2 py-2 text-center">{t("homework")}</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-t border-line">
                <td className="px-4 py-2">
                  <input type="hidden" name="students" value={s.id} />
                  {s.name}
                </td>
                <td className="px-2 py-2 text-center">
                  <input type="checkbox" name={`present_${s.id}`} defaultChecked={s.present} aria-label={`${s.name}: ${t("present")}`} className="size-6" />
                </td>
                <td className="px-2 py-2 text-center">
                  <input type="checkbox" name={`homework_${s.id}`} defaultChecked={s.homework} aria-label={`${s.name}: ${t("homework")}`} className="size-6" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" variant="glow" size="pill" disabled={pending}>
          {t("save")}
        </Button>
        <Status state={state} ns="journal" />
      </div>
    </form>
  );
}

/** Олимпиада тапсырмасы: тақырып → бүкіл тақырып не таңдалған есептер, генератор есептері, мерзімі */
export function OlympiadAssignmentForm({
  classId,
  topics,
  problems,
}: {
  classId: string;
  topics: { n: number; title: string; generators: number }[];
  problems: { id: string; topic: number; level: number; type: string; kk: string }[];
}) {
  const t = useTranslations("Olympiad.teacher.assignments");
  const [state, action, pending] = useActionState(createOlympiadAssignment, null);
  const [topic, setTopic] = useState(topics[0]?.n ?? 1);
  const [mode, setMode] = useState<"topic" | "set">("topic");
  const inTopic = problems.filter((p) => p.topic === topic);
  const generators = topics.find((x) => x.n === topic)?.generators ?? 0;
  return (
    <form action={action} className="flex flex-col gap-3 rounded-3xl border border-line bg-panel p-5">
      <input type="hidden" name="classId" value={classId} />
      <label className="flex flex-col gap-1 text-[0.9rem]">
        <span className="font-semibold">{t("topic")}</span>
        <select name="topic" value={topic} onChange={(e) => setTopic(Number(e.target.value))} className={FIELD}>
          {topics.map((x) => (
            <option key={x.n} value={x.n}>
              {x.n}. {x.title}
            </option>
          ))}
        </select>
      </label>
      <fieldset className="flex flex-col gap-1.5 text-[0.92rem]">
        <legend className="mb-1 font-semibold">{t("mode")}</legend>
        {(["topic", "set"] as const).map((value) => (
          <label key={value} className="flex items-center gap-2">
            <input type="radio" name="mode" value={value} checked={mode === value} onChange={() => setMode(value)} className="size-4" />
            {t(`modes.${value}`, { count: inTopic.length })}
          </label>
        ))}
      </fieldset>
      {mode === "set" && (
        <fieldset className="flex max-h-64 flex-col gap-1 overflow-y-auto rounded-xl border border-line p-2">
          <legend className="sr-only">{t("problems")}</legend>
          {inTopic.map((p) => (
            <label key={p.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 text-[0.85rem] hover:bg-panel-2">
              <input type="checkbox" name="problems" value={p.id} className="mt-0.5 size-4 shrink-0" />
              <span>
                <span className="font-mono text-cyan">{p.id}</span> · {t("level", { level: p.level })} · {p.kk}
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {generators > 0 && (
        <label className="flex items-center gap-2 text-[0.92rem]">
          <input type="checkbox" name="generators" defaultChecked className="size-4" />
          {t("generators", { count: generators })}
        </label>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("titleLabel")}</span>
          <input name="title" maxLength={120} placeholder={t("titlePlaceholder")} className={FIELD} />
        </label>
        <label className="flex flex-col gap-1 text-[0.9rem]">
          <span className="font-semibold">{t("due")}</span>
          <input type="date" name="due" className={FIELD} />
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
