import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import type { LessonPlan } from "@/features/lesson-studio/schema";
import { Link } from "@/i18n/navigation";
import { getMolecule } from "@/lib/chemistry/molecules";

type Props = {
  plan: LessonPlan;
  grade: number | null;
  duration: number | null;
  teacherName: string | null;
};

/** Платформа ресурсының сілтемесі */
function resourceHref(kind: LessonPlan["platformResources"][number]["kind"], target: string) {
  const molecule = getMolecule(target)?.id;
  switch (kind) {
    case "molecule3d":
      return molecule ? `/molecules/${molecule}` : "/molecules";
    case "ar":
      return molecule ? `/ar/${molecule}` : "/molecules";
    case "lab":
      return "/virtual-lab/titration";
    case "test":
      return "/exam/unt";
    case "periodic":
      return "/periodic-table";
    case "ai":
      return "/ai-tutor";
  }
}

/** ҚМЖ беті: экранда да, басып шығарғанда (PDF) да оқылатын кесте түрі */
export async function LessonPlanView({ plan, grade, duration, teacherName }: Props) {
  const t = await getTranslations("LessonStudio");
  const tTeacher = await getTranslations("Teacher");
  const totalMinutes = plan.stages.reduce((sum, s) => sum + s.minutes, 0);

  return (
    <article className="flex flex-col gap-6 text-[0.93rem] print:gap-4 print:text-[10.5pt] print:text-black">
      <header className="flex flex-col gap-1 border-b border-line pb-4 print:border-black">
        <p className="text-[0.8rem] font-semibold tracking-[0.06em] text-cyan uppercase print:text-black">{t("planEyebrow")}</p>
        <h1 className="text-[clamp(1.4rem,3vw,2rem)] font-bold">{plan.topic}</h1>
        <p className="text-muted-foreground print:text-black">
          {[grade ? tTeacher("gradeN", { n: grade }) : null, duration ? t("minutes", { count: duration }) : null, teacherName]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </header>

      <Block title={t("sections.learningObjectives")}>
        <List items={plan.learningObjectives} />
      </Block>
      <Block title={t("sections.lessonObjectives")}>
        <List items={plan.lessonObjectives} />
      </Block>
      <Block title={t("sections.assessmentCriteria")}>
        <List items={plan.assessmentCriteria} />
      </Block>
      <div className="grid gap-4 sm:grid-cols-2 print:grid-cols-2">
        <Block title={t("sections.terms")}>
          <p>{plan.languageObjectives.terms.join(", ")}</p>
          {plan.languageObjectives.phrases.length > 0 && <List items={plan.languageObjectives.phrases} />}
        </Block>
        <Block title={t("sections.priorKnowledge")}>
          <p>{plan.priorKnowledge}</p>
        </Block>
        <Block title={t("sections.values")}>
          <p>{plan.values}</p>
        </Block>
        <Block title={t("sections.crossCurricular")}>
          <p>{plan.crossCurricular}</p>
        </Block>
      </div>

      {/* Сабақ барысы */}
      <section>
        <h2 className="mb-2 font-display text-[1.05rem] font-semibold">
          {t("sections.stages")}{" "}
          <span className={totalMinutes === duration ? "text-muted-foreground" : "text-amber"}>
            ({t("minutes", { count: totalMinutes })})
          </span>
        </h2>
        <div className="overflow-x-auto rounded-2xl border border-line print:overflow-visible print:rounded-none print:border-black">
          <table className="w-full min-w-[720px] border-collapse text-left align-top print:min-w-0">
            <thead className="bg-panel-2 text-[0.78rem] text-muted-foreground print:bg-transparent print:text-black">
              <tr>
                <th className="w-[13%] border-b border-line px-3 py-2 print:border-black">{t("columns.stage")}</th>
                <th className="w-[27%] border-b border-line px-3 py-2 print:border-black">{t("columns.teacher")}</th>
                <th className="w-[27%] border-b border-line px-3 py-2 print:border-black">{t("columns.student")}</th>
                <th className="w-[17%] border-b border-line px-3 py-2 print:border-black">{t("columns.assessment")}</th>
                <th className="w-[16%] border-b border-line px-3 py-2 print:border-black">{t("columns.resources")}</th>
              </tr>
            </thead>
            <tbody>
              {plan.stages.map((s, i) => (
                <tr key={i} className="border-t border-line align-top print:break-inside-avoid print:border-black">
                  <td className="px-3 py-2.5">
                    <b>{t(`stageNames.${s.stage}`)}</b>
                    <br />
                    <span className="font-mono text-[0.82rem] text-muted-foreground print:text-black">{t("minutes", { count: s.minutes })}</span>
                  </td>
                  <td className="px-3 py-2.5 whitespace-pre-line">{s.teacherActions}</td>
                  <td className="px-3 py-2.5 whitespace-pre-line">{s.studentActions}</td>
                  <td className="px-3 py-2.5 whitespace-pre-line">{s.assessment}</td>
                  <td className="px-3 py-2.5">{s.resources.join("; ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Тапсырмалар және дескрипторлар */}
      <section>
        <h2 className="mb-2 font-display text-[1.05rem] font-semibold">{t("sections.tasks")}</h2>
        <ol className="flex flex-col gap-3">
          {plan.tasks.map((task, i) => (
            <li key={i} className="rounded-2xl border border-line bg-panel p-4 print:break-inside-avoid print:rounded-none print:border-black print:bg-transparent">
              <p className="font-semibold">
                {i + 1}. {task.title} <span className="font-mono text-[0.82rem] text-cyan print:text-black">· {t("points", { count: task.points })}</span>
              </p>
              <p className="mt-1 whitespace-pre-line">{task.description}</p>
              <p className="mt-2 text-[0.8rem] font-semibold text-muted-foreground print:text-black">{t("descriptors")}</p>
              <List items={task.descriptors} />
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-4 sm:grid-cols-3 print:grid-cols-3">
        <Block title={t("sections.differentiation")}>
          <p>{plan.differentiation}</p>
        </Block>
        <Block title={t("sections.reflection")}>
          <p>{plan.reflection}</p>
        </Block>
        <Block title={t("sections.homework")}>
          <p>{plan.homework}</p>
        </Block>
      </div>

      {plan.platformResources.length > 0 && (
        <section>
          <h2 className="mb-2 font-display text-[1.05rem] font-semibold">{t("sections.platform")}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {plan.platformResources.map((r, i) => {
              const molecule = getMolecule(r.target);
              return (
                <li key={i}>
                  <Link
                    href={resourceHref(r.kind, r.target)}
                    className="flex h-full flex-col gap-0.5 rounded-2xl border border-cyan-dim bg-cyan/5 px-4 py-3 hover:bg-cyan/10 print:rounded-none print:border-black print:bg-transparent"
                  >
                    <span className="font-semibold text-cyan print:text-black">
                      {t(`resources.${r.kind}`)}
                      {molecule && ` · ${molecule.formula}`}
                    </span>
                    <span className="text-[0.85rem] text-muted-foreground print:text-black">{r.note}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="text-[0.78rem] text-muted-foreground print:text-black">{t("aiNote")}</p>
    </article>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="print:break-inside-avoid">
      <h2 className="mb-1.5 font-display text-[1.05rem] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-0.5 pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
