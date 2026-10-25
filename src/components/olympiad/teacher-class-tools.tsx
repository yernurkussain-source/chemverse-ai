import { getFormatter, getTranslations } from "next-intl/server";
import { CalendarEditor, OlympiadAssignmentForm, ScheduleForm } from "@/components/olympiad/teacher-forms";
import { getTopics } from "@/features/olympiad/server/queries";
import { getAssignableProblems, getClassAssignments, getClassSessions, getClassStudents, getHeatmap } from "@/features/olympiad/server/teacher";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

type ClassInfo = { id: string; name: string };

/** Таңдалған сыныптың құралдары: күнтізбе (+ журнал), меңгеру картасы, тапсырмалар */
export async function ClassTools({ classes, selected, teacherId }: { classes: ClassInfo[]; selected: ClassInfo; teacherId: string }) {
  const t = await getTranslations("Olympiad.teacher");
  return (
    <div className="flex flex-col gap-12">
      {classes.length > 1 && (
        <nav aria-label={t("classPicker")} className="flex flex-wrap gap-2">
          {classes.map((c) => (
            <Link
              key={c.id}
              href={{ pathname: "/teacher/olympiad", query: { class: c.id } }}
              aria-current={c.id === selected.id ? "page" : undefined}
              className={cn("rounded-full border px-4 py-1.5 text-[0.9rem] font-semibold", c.id === selected.id ? "border-cyan bg-cyan text-on-accent" : "border-line hover:border-cyan-dim")}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      )}
      <Calendar classId={selected.id} className={selected.name} />
      <Heatmap classId={selected.id} />
      <Assignments classId={selected.id} teacherId={teacherId} />
    </div>
  );
}

async function Assignments({ classId, teacherId }: { classId: string; teacherId: string }) {
  const [topics, problems, students, t, tRoot, format] = await Promise.all([
    getTopics(),
    getAssignableProblems(teacherId),
    getClassStudents(classId),
    getTranslations("Olympiad.teacher.assignments"),
    getTranslations("Olympiad"),
    getFormatter(),
  ]);
  const list = await getClassAssignments(classId, students.map((s) => s.id));
  return (
    <section aria-labelledby="assignments" className="flex flex-col gap-3">
      <h2 id="assignments" className="font-display text-xl font-semibold">
        {t("title")}
      </h2>
      <p className="text-[0.9rem] text-muted-foreground">{t("subtitle")}</p>
      <OlympiadAssignmentForm
        classId={classId}
        topics={topics.filter((x) => x.n <= 32).map((x) => ({ n: x.n, title: x.title, generators: x.generators.length }))}
        problems={problems}
      />
      {list.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {list.map((a) => (
            <li key={a.id} className="flex flex-col gap-1 rounded-2xl border border-line bg-panel p-4">
              <span className="font-semibold">{a.title || tRoot("topicN", { n: a.olympiad.topic })}</span>
              <span className="text-[0.82rem] text-muted-foreground">
                {t("info", { count: a.olympiad.items.length })}
                {a.due_at && ` · ${t("dueShort", { date: format.dateTime(new Date(a.due_at), { day: "numeric", month: "short" }) })}`}
              </span>
              <span className="font-mono text-[0.85rem] text-cyan">{t("done", { done: a.done, total: students.length })}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

async function Calendar({ classId, className }: { classId: string; className: string }) {
  const [sessions, topics, t] = await Promise.all([getClassSessions(classId), getTopics(), getTranslations("Olympiad.teacher.calendar")]);
  const title = new Map(topics.map((topic) => [topic.n, topic.title]));
  return (
    <section aria-labelledby="calendar" className="flex flex-col gap-3">
      <h2 id="calendar" className="font-display text-xl font-semibold">
        {t("title")} · {className}
      </h2>
      <p className="text-[0.9rem] text-muted-foreground">{t("subtitle")}</p>
      {sessions.length === 0 ? (
        <ScheduleForm classId={classId} />
      ) : (
        <>
          <CalendarEditor
            classId={classId}
            sessions={sessions.map((s) => ({ id: s.id, topic: s.topic, title: title.get(s.topic) ?? "", date: s.date, time: s.lesson_time }))}
          />
          <details className="rounded-3xl border border-line bg-panel-2 p-4">
            <summary className="cursor-pointer font-semibold">{t("regenerate")}</summary>
            <div className="mt-3">
              <ScheduleForm classId={classId} />
            </div>
          </details>
        </>
      )}
    </section>
  );
}

const cellColor = (level: number | null) =>
  level === null ? "bg-panel-2" : level >= 80 ? "bg-good" : level >= 40 ? "bg-amber" : level > 0 ? "bg-pink" : "bg-pink/40";

/** Меңгеру жылу картасы: оқушы × тақырып (1–32) */
async function Heatmap({ classId }: { classId: string }) {
  const [{ students, level }, t] = await Promise.all([getHeatmap(classId), getTranslations("Olympiad.teacher.heatmap")]);
  const topics = Array.from({ length: 32 }, (_, i) => i + 1);
  return (
    <section aria-labelledby="heatmap" className="flex flex-col gap-3">
      <h2 id="heatmap" className="font-display text-xl font-semibold">
        {t("title")}
      </h2>
      <p className="text-[0.9rem] text-muted-foreground">{t("subtitle")}</p>
      {students.length === 0 ? (
        <p className="rounded-2xl border border-line bg-panel-2 px-4 py-3 text-muted-foreground">{t("empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-3xl border border-line bg-panel p-3">
          <table className="border-separate border-spacing-0.5 text-[0.75rem]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-panel px-2 text-left font-semibold">{t("student")}</th>
                {topics.map((n) => (
                  <th key={n} className="w-7 font-mono font-normal text-muted-foreground">
                    {n}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <th scope="row" className="sticky left-0 z-10 max-w-36 truncate bg-panel px-2 text-left font-semibold">
                    {s.name}
                  </th>
                  {topics.map((n) => {
                    const value = level(s.id, n);
                    const label = `${s.name} · ${n}: ${value === null ? "—" : `${Math.round(value)}%`}`;
                    return (
                      <td key={n} title={label} aria-label={label} className={cn("size-7 rounded", cellColor(value))}>
                        <span className="sr-only">{label}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 flex flex-wrap items-center gap-3 text-[0.78rem] text-muted-foreground">
            <Legend color="bg-panel-2" text={t("none")} />
            <Legend color="bg-pink" text="< 40%" />
            <Legend color="bg-amber" text="40–79%" />
            <Legend color="bg-good" text="≥ 80%" />
          </p>
        </div>
      )}
    </section>
  );
}

function Legend({ color, text }: { color: string; text: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("inline-block size-3.5 rounded", color)} />
      {text}
    </span>
  );
}
